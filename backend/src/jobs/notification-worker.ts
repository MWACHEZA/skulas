import prisma from '../lib/prisma';
import { NotificationService } from '../services/notifications';

export class NotificationWorker {
  private isRunning = false;
  private intervalId?: NodeJS.Timeout;

  start() {
    if (this.isRunning) return;
    this.isRunning = true;
    
    // Run every 10 seconds to process the queue
    this.intervalId = setInterval(() => {
      this.processQueue().catch(err => console.error('Error in NotificationWorker processQueue:', err));
    }, 10000);
    
    console.log('Notification Worker started.');
  }

  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
    }
    this.isRunning = false;
    console.log('Notification Worker stopped.');
  }

  private async processQueue() {
    // Fetch pending notifications that are due
    const limit = 50; // Meta rate limiting buffer
    const batch = await prisma.notificationQueue.findMany({
      where: {
        status: 'PENDING',
        nextAttempt: { lte: new Date() }
      },
      take: limit,
      orderBy: { createdAt: 'asc' }
    });

    if (batch.length === 0) return;

    // Process each notification
    for (const job of batch) {
      // Mark as PROCESSING
      await prisma.notificationQueue.update({
        where: { id: job.id },
        data: { status: 'PROCESSING' }
      });

      try {
        let providerMsgId: string | null = null;
        let finalStatus = 'COMPLETED';
        let errorDetails: string | null = null;

        if (job.type === 'WhatsApp') {
          // Fetch school settings for WhatsApp API
          const settings = await prisma.schoolSetting.findFirst({
            where: { schoolId: job.schoolId }
          });

          if (!settings?.whatsappApiUrl || !settings?.whatsappAccessToken) {
            throw new Error('WhatsApp API settings not configured for this school.');
          }

          if (!job.recipientPhone) {
            throw new Error('Recipient phone number is missing.');
          }

          const payload = JSON.parse(job.payload);

          // Meta WhatsApp API requires recipient phone number to be in international format without '+'
          const to = job.recipientPhone.replace(/[^0-9]/g, '');

          // Resolve preferred language
          let preferredLanguage = "en";
          try {
            const parent = await prisma.parent.findFirst({ where: { phone: job.recipientPhone } });
            if (parent?.preferredLanguage) {
              preferredLanguage = parent.preferredLanguage;
            } else {
              const student = await prisma.student.findFirst({ where: { phone: job.recipientPhone } });
              if (student?.preferredLanguage) {
                preferredLanguage = student.preferredLanguage;
              } else {
                const user = await prisma.user.findFirst({ where: { phone: job.recipientPhone } });
                if (user?.preferredLanguage) {
                  preferredLanguage = user.preferredLanguage;
                }
              }
            }
          } catch (e) {
            console.error(`Failed to resolve language for ${job.recipientPhone}:`, e);
          }

          // Construct Meta Payload
          const metaPayload = {
            messaging_product: "whatsapp",
            to: to,
            type: "template",
            template: {
              name: job.template,
              language: {
                code: preferredLanguage
              },
              components: payload.components || []
            }
          };

          // Send request or Mock
          if (process.env.MOCK_WHATSAPP === 'true') {
            // Simulate realistic API latency (200ms - 500ms)
            await new Promise(resolve => setTimeout(resolve, 200 + Math.random() * 300));
            console.log(`[MOCK WHATSAPP] Sent template ${job.template} to ${to}`);
            providerMsgId = `mock_wamid_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
          } else {
            const response = await fetch(settings.whatsappApiUrl, {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${settings.whatsappAccessToken}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify(metaPayload)
            });

            const data = await response.json() as any;

            if (!response.ok) {
              throw new Error(`Meta API Error: ${data.error?.message || JSON.stringify(data)}`);
            }

            providerMsgId = data.messages?.[0]?.id || null;
          }
        } else {
          // Future SMS / Email integrations
          // For now just mock as success
          finalStatus = 'COMPLETED';
        }

        // Success - update job and log
        await prisma.notificationQueue.update({
          where: { id: job.id },
          data: { status: finalStatus, updatedAt: new Date() }
        });

        // Add to communication log
        await NotificationService.logCommunication({
          schoolId: job.schoolId,
          senderId: job.senderId,
          studentId: job.studentId || undefined,
          type: job.type,
          description: `Template: ${job.template || 'Message'}`,
          status: 'Sent', // This will be updated by webhook later if applicable
          providerMsgId: providerMsgId || undefined
        });

      } catch (error: any) {
        console.error(`Job ${job.id} failed:`, error.message);

        // Handle retries
        const maxRetries = 3;
        if (job.retries < maxRetries) {
          // Exponential backoff (e.g. 1m, 5m, 15m)
          const backoffMinutes = Math.pow(5, job.retries);
          const nextAttempt = new Date();
          nextAttempt.setMinutes(nextAttempt.getMinutes() + backoffMinutes);

          await prisma.notificationQueue.update({
            where: { id: job.id },
            data: {
              status: 'PENDING',
              retries: job.retries + 1,
              nextAttempt,
              errorDetails: error.message
            }
          });
        } else {
          // Max retries exceeded
          await prisma.notificationQueue.update({
            where: { id: job.id },
            data: {
              status: 'FAILED',
              errorDetails: error.message
            }
          });

          // Log failure
          await NotificationService.logCommunication({
            schoolId: job.schoolId,
            senderId: job.senderId,
            studentId: job.studentId || undefined,
            type: job.type,
            description: `Template: ${job.template || 'Message'}`,
            status: 'Failed',
            errorDetails: error.message
          });
        }
      }
    }
  }
}

export const notificationWorker = new NotificationWorker();

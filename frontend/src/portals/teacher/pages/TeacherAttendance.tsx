import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function TeacherAttendance() {
  const [activeTab, setActiveTab] = useState('roll-call');
  const [classId, setClassId] = useState('');
  const [session, setSession] = useState('Morning');

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Attendance & Roll Call</h1>
      
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-4">
          <TabsTrigger value="roll-call">Daily Roll Call</TabsTrigger>
          <TabsTrigger value="qr-scan">QR Scanner</TabsTrigger>
          <TabsTrigger value="reports">Reports & Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="roll-call">
          <Card>
            <CardHeader>
              <CardTitle>Daily Roll Call</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-4 mb-4">
                <div>
                  <Label>Class ID</Label>
                  <Input value={classId} onChange={(e) => setClassId(e.target.value)} placeholder="e.g. class-123" />
                </div>
                <div>
                  <Label>Session</Label>
                  <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50" value={session} onChange={(e) => setSession(e.target.value)}>
                    <option value="Morning">Morning</option>
                    <option value="Afternoon">Afternoon</option>
                    <option value="Evening">Evening</option>
                  </select>
                </div>
              </div>
              <Button>Fetch Roll Call</Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="qr-scan">
          <Card>
            <CardHeader>
              <CardTitle>QR Code Session</CardTitle>
            </CardHeader>
            <CardContent>
              <Button>Generate QR Code</Button>
              <p className="mt-2 text-sm text-muted-foreground">Students can scan this code to mark attendance for the current period.</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="reports">
          <Card>
            <CardHeader>
              <CardTitle>Attendance Reports</CardTitle>
            </CardHeader>
            <CardContent>
              <p>Chronic absentee flags and reports will appear here.</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

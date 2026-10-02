export declare class ComplianceService {
    /**
     * ZIMRA VAT2 Return data generator for a given month (YYYY-MM).
     * Generates both structured data and ZIMRA e-services CSV format.
     */
    static getVat2Return(schoolId: string, period: string): Promise<{
        period: string;
        schoolName: string | undefined;
        vatNumber: string;
        standardRatedSales: number;
        standardRatedVat: number;
        exemptSales: number;
        creditNotesTotal: number;
        creditNotesVat: number;
        netTaxableSales: number;
        netVatPayable: number;
        csvContent: string;
    }>;
    /**
     * ZIMRA P2 (PAYE) & NSSA Return data generator for a given month
     */
    static getP2NssaReturn(schoolId: string, period: string): Promise<{
        period: string;
        schoolName: string | undefined;
        grossSalaries: number;
        payeWithheld: number;
        nssaEmployer: number;
        nssaEmployee: number;
        totalStatutoryDue: number;
        csvContent: string;
    }>;
    /**
     * Enforce period lock at service layer.
     * Throws an error naming the locked period if posting to closed period.
     */
    static enforcePeriodLock(schoolId: string, period: string): Promise<void>;
    /**
     * Enforce Debtor Limit on student invoicing.
     * Blocks invoice if balance + newAmount > debtorLimit, unless an override approval exists.
     */
    static checkDebtorLimit(schoolId: string, studentId: string, newInvoiceAmount: number): Promise<{
        allowed: boolean;
        limit: number;
        currentBalance: number;
        projectedBalance: number;
    }>;
    /**
     * Enforce Negative Stock Block.
     * Prevents sales/dispense/issue if inventory would drop below 0.
     */
    static checkNegativeStock(schoolId: string, currentStock: number, quantityToDeduct: number, itemName: string): Promise<void>;
    /**
     * Ministry of Primary and Secondary Education (EMIS) data extract.
     * Generates standard tables: Enrolment by Form/Gender, Termly fees billed vs collected.
     */
    static getEmisDataExtract(schoolId: string, academicYear?: string): Promise<{
        academicYear: string;
        totalEnrolment: number;
        formBreakdown: Record<string, {
            male: number;
            female: number;
            total: number;
        }>;
        feesSummary: {
            totalBilled: number;
            totalCollected: number;
            outstanding: number;
            collectionRatePercent: number;
        };
    }>;
    /**
     * Student Clearance Workflow:
     * Cross-checks Library (no unreturned books), Fees (balance <= 0), Hostel.
     */
    static getStudentClearance(schoolId: string, studentId: string): Promise<{
        clearance: {
            student: {
                section: string | null;
                id: string;
                name: string;
                createdAt: Date;
                updatedAt: Date;
                address: string | null;
                email: string | null;
                phone: string | null;
                status: string;
                schoolId: string;
                studentId: string;
                hostelId: string | null;
                category: string | null;
                preferredLanguage: string | null;
                userId: string | null;
                dob: Date | null;
                gender: string | null;
                classId: string | null;
                programLevel: string | null;
                studyMode: string | null;
                researchTitle: string | null;
                startDate: Date | null;
                maxCompletionDate: Date | null;
                extensionMonths: number;
                standing: string;
                part: number;
                enrolledAt: Date;
                guardianName: string | null;
                boardingStatus: string;
                roomId: string | null;
                prevSchool: string | null;
                reasonForTransfer: string | null;
                lastGradeAchieved: string | null;
                admissionsNotes: string | null;
                academicHistory: import("../generated/client/runtime/library").JsonValue | null;
                enrollmentDate: Date | null;
                nationalId: string | null;
                hexcoId: string | null;
                houseId: string | null;
                motherTongue: string | null;
                nationality: string | null;
                city: string | null;
                state: string | null;
                prevSchoolClass: string | null;
                prevSchoolAddress: string | null;
                hasTransferCertificate: boolean;
                transferCertificateUrl: string | null;
                isPhysicallyHandicapped: boolean;
                handicapDetails: string | null;
                dormitory: string | null;
                birthCertificateUrl: string | null;
                age: number | null;
                clubId: string | null;
            };
        } & {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            status: string;
            schoolId: string;
            studentId: string;
            libraryCleared: boolean;
            libraryNotes: string | null;
            librarySignedBy: string | null;
            librarySignedAt: Date | null;
            feesCleared: boolean;
            feesBalance: number;
            feesNotes: string | null;
            feesSignedBy: string | null;
            feesSignedAt: Date | null;
            hostelCleared: boolean;
            hostelNotes: string | null;
            hostelSignedBy: string | null;
            hostelSignedAt: Date | null;
            finalCleared: boolean;
            finalSignedBy: string | null;
            finalSignedAt: Date | null;
            certificateNo: string | null;
        };
        checks: {
            library: {
                cleared: boolean;
                unreturnedBooksCount: number;
                books: string[];
            };
            fees: {
                cleared: boolean;
                balance: number;
            };
            hostel: {
                cleared: boolean;
                notes: string | null;
            };
            final: {
                cleared: boolean;
                certificateNo: string | null;
                signedBy: string | null;
                signedAt: Date | null;
            };
        };
    }>;
    /**
     * Sign-off clearance section (Library, Fees, Hostel, or Final Admin/Bursar sign-off)
     */
    static signoffClearance(schoolId: string, studentId: string, section: 'LIBRARY' | 'FEES' | 'HOSTEL' | 'FINAL', userId: string, notes?: string): Promise<{
        student: {
            section: string | null;
            id: string;
            name: string;
            createdAt: Date;
            updatedAt: Date;
            address: string | null;
            email: string | null;
            phone: string | null;
            status: string;
            schoolId: string;
            studentId: string;
            hostelId: string | null;
            category: string | null;
            preferredLanguage: string | null;
            userId: string | null;
            dob: Date | null;
            gender: string | null;
            classId: string | null;
            programLevel: string | null;
            studyMode: string | null;
            researchTitle: string | null;
            startDate: Date | null;
            maxCompletionDate: Date | null;
            extensionMonths: number;
            standing: string;
            part: number;
            enrolledAt: Date;
            guardianName: string | null;
            boardingStatus: string;
            roomId: string | null;
            prevSchool: string | null;
            reasonForTransfer: string | null;
            lastGradeAchieved: string | null;
            admissionsNotes: string | null;
            academicHistory: import("../generated/client/runtime/library").JsonValue | null;
            enrollmentDate: Date | null;
            nationalId: string | null;
            hexcoId: string | null;
            houseId: string | null;
            motherTongue: string | null;
            nationality: string | null;
            city: string | null;
            state: string | null;
            prevSchoolClass: string | null;
            prevSchoolAddress: string | null;
            hasTransferCertificate: boolean;
            transferCertificateUrl: string | null;
            isPhysicallyHandicapped: boolean;
            handicapDetails: string | null;
            dormitory: string | null;
            birthCertificateUrl: string | null;
            age: number | null;
            clubId: string | null;
        };
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        status: string;
        schoolId: string;
        studentId: string;
        libraryCleared: boolean;
        libraryNotes: string | null;
        librarySignedBy: string | null;
        librarySignedAt: Date | null;
        feesCleared: boolean;
        feesBalance: number;
        feesNotes: string | null;
        feesSignedBy: string | null;
        feesSignedAt: Date | null;
        hostelCleared: boolean;
        hostelNotes: string | null;
        hostelSignedBy: string | null;
        hostelSignedAt: Date | null;
        finalCleared: boolean;
        finalSignedBy: string | null;
        finalSignedAt: Date | null;
        certificateNo: string | null;
    }>;
}

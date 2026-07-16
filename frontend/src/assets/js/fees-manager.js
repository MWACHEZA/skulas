/**
 * Fees Management Utility
 * Handles tiered fee structures for ZJC, O-Level, and A-Level
 */

const DefaultFeeStructures = {
    "ZJC": {
        "description": "Junior Level (Form 1 - 2)",
        "base": [
            { "desc": "SDC", "amount": 130.00 },
            { "desc": "Tuition", "amount": 8.00 },
            { "desc": "Boarding", "amount": 138.00 },
            { "desc": "Sports", "amount": 8.00 },
            { "desc": "Textbook & Exams", "amount": 65.00 },
            { "desc": "Practicals", "amount": 10.00 },
            { "desc": "Repairs & Maintenance", "amount": 30.00 },
            { "desc": "Affiliation & Rates", "amount": 42.00 },
            { "desc": "Wages & Salaries", "amount": 71.00 },
            { "desc": "Medical", "amount": 8.00 }
        ]
    },
    "O-Level": {
        "description": "Ordinary Level (Form 3 - 4)",
        "base": [
            { "desc": "SDC", "amount": 130.00 },
            { "desc": "Tuition", "amount": 8.00 },
            { "desc": "Boarding", "amount": 138.00 },
            { "desc": "Sports", "amount": 8.00 },
            { "desc": "Textbook & Exams", "amount": 75.00 },
            { "desc": "Repairs & Maintenance", "amount": 30.00 },
            { "desc": "Affiliation & Rates", "amount": 42.00 },
            { "desc": "Wages & Salaries", "amount": 71.00 },
            { "desc": "Medical", "amount": 8.00 }
        ],
        "combinations": {
            "Sciences": [
                { "desc": "Science Lab Fees", "amount": 40.00 },
                { "desc": "Science Practicals", "amount": 25.00 }
            ],
            "Commercials": [
                { "desc": "Business Studies Levy", "amount": 20.00 },
                { "desc": "Accounting Software License", "amount": 15.00 }
            ],
            "Arts": [
                { "desc": "Arts Materials", "amount": 15.00 },
                { "desc": "History Excursion Fund", "amount": 10.00 }
            ]
        }
    },
    "A-Level": {
        "description": "Advanced Level (Lower 6 - Upper 6)",
        "base": [
            { "desc": "SDC", "amount": 150.00 },
            { "desc": "Tuition", "amount": 10.00 },
            { "desc": "Boarding", "amount": 150.00 },
            { "desc": "Sports", "amount": 10.00 },
            { "desc": "Textbook & Library", "amount": 90.00 },
            { "desc": "Repairs & Maintenance", "amount": 40.00 },
            { "desc": "Affiliation & Rates", "amount": 50.00 },
            { "desc": "Wages & Salaries", "amount": 80.00 },
            { "desc": "Medical", "amount": 10.00 }
        ],
        "combinations": {
            "Sciences": [
                { "desc": "Advanced Lab Fees", "amount": 60.00 },
                { "desc": "Complex Practicals", "amount": 40.00 }
            ],
            "Commercials": [
                { "desc": "Premium Business Levy", "amount": 30.00 },
                { "desc": "Audit & Finance Kit", "amount": 25.00 }
            ],
            "Arts": [
                { "desc": "Advanced Arts Materials", "amount": 25.00 },
                { "desc": "Humanities Research Fund", "amount": 20.00 }
            ]
        }
    }
};

const FeesManager = {
    getStructures: function () {
        const saved = getTenantData('official_fees_v2', 'null');
        if (!saved) return DefaultFeeStructures;

        try {
            const structures = JSON.parse(saved);
            // Ensure architecture is compatible (must have ZJC, O-Level, A-Level)
            if (!structures["ZJC"] || !structures["O-Level"] || !structures["A-Level"]) {
                console.warn("Legacy fee structure detected, reverting to defaults");
                return DefaultFeeStructures;
            }
            return structures;
        } catch (e) {
            return DefaultFeeStructures;
        }
    },

    saveStructures: function (structures) {
        saveTenantData('official_fees_v2', structures);
    },

    getFeeForStudent: function (level, combination = null) {
        const structures = this.getStructures();
        const tier = structures[level];
        if (!tier) return [];

        let totalFees = [...(tier.base || [])];
        if (combination && tier.combinations && tier.combinations[combination]) {
            totalFees = totalFees.concat(tier.combinations[combination]);
        }
        return totalFees;
    },

    /**
     * Map a specific class name to a fee tier and combination
     */
    getFeeForClass: function (className) {
        if (!className) {
            console.warn("FeesManager: No className provided");
            return [];
        }

        const normalized = className.toString().toLowerCase();
        let level = "";
        let combination = null;

        // Level detection
        if (normalized.includes("form 1") || normalized.includes("form 1") || normalized.includes("form1") ||
            normalized.includes("form 2") || normalized.includes("form2") ||
            normalized.includes("form one") || normalized.includes("form two") || normalized.includes("zjc")) {
            level = "ZJC";
        } else if (normalized.includes("form 3") || normalized.includes("form3") ||
            normalized.includes("form 4") || normalized.includes("form4") ||
            normalized.includes("form three") || normalized.includes("form four") ||
            normalized.includes("o-level") || normalized.includes("o level") || normalized.includes("olevel")) {
            level = "O-Level";
        } else if (normalized.includes("six") || normalized.includes("form 5") || normalized.includes("form5") ||
            normalized.includes("form 6") || normalized.includes("form6") ||
            normalized.includes("a-level") || normalized.includes("a level") || normalized.includes("alevel")) {
            level = "A-Level";
        }

        // Combination detection
        if (normalized.includes("science")) {
            combination = "Sciences";
        } else if (normalized.includes("commercial") || normalized.includes("business")) {
            combination = "Commercials";
        } else if (normalized.includes("arts") || normalized.includes("humanities")) {
            combination = "Arts";
        }

        console.log(`FeesManager: Mapping "${className}" -> Level: ${level}, Combination: ${combination}`);
        return this.getFeeForStudent(level, combination);
    },

    calculateTotal: function (fees) {
        return fees.reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0);
    }
};

window.FeesManager = FeesManager;


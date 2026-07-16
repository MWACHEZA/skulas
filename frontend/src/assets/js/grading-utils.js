/**
 * Grading Utilities for Embakwe High School
 */

const GradingUtils = {
    // Junior (ZJC - Form 1/2)
    getJuniorSymbol: (mark) => {
        const m = parseFloat(mark);
        if (m >= 75) return "1";
        if (m >= 70) return "2";
        if (m >= 65) return "3";
        if (m >= 60) return "4";
        if (m >= 55) return "5";
        if (m >= 50) return "6";
        if (m >= 45) return "7";
        if (m >= 40) return "8";
        return "9";
    },

    // "O" Level (Form 3/4)
    getOLevelSymbol: (mark) => {
        const m = parseFloat(mark);
        if (m >= 75) return "A";
        if (m >= 60) return "B";
        if (m >= 50) return "C";
        if (m >= 45) return "D";
        if (m >= 40) return "E";
        return "F";
    },

    // "A" Level (Lower/Upper Six)
    getALevelSymbol: (mark) => {
        const m = parseFloat(mark);
        if (m >= 75) return "A";
        if (m >= 60) return "B";
        if (m >= 50) return "C";
        if (m >= 45) return "D";
        if (m >= 40) return "E";
        if (m >= 35) return "O";
        return "F";
    },

    getALevelPoints: (symbol) => {
        switch (symbol) {
            case "A": return 5;
            case "B": return 4;
            case "C": return 3;
            case "D": return 2;
            case "E": return 1;
            default: return 0;
        }
    },

    getMeaning: (symbol, level) => {
        const m = symbol.toString().toUpperCase();
        if (level === 'alevel') {
            if (m === 'O') return "Ordinary Level Pass";
            if (m === 'F') return "Fail";
        }
        // General meanings from teacher's key image
        const key = {
            'A': 'Excellent',
            '1': 'Excellent',
            'B': 'Very Good',
            '2': 'Very Good',
            'C': 'Good',
            '3': 'Good',
            'D': 'Satisfactory',
            '4': 'Satisfactory',
            'E': 'Can Improve',
            '5': 'Can Improve',
            '6': 'Should work harder',
            'F': 'Weak',
            '7': 'Weak',
            '8': 'Very Weak',
            '9': 'Unsatisfactory',
        };
        return key[m] || "";
    }
};

if (typeof module !== 'undefined') {
    module.exports = GradingUtils;
}


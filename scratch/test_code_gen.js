const generateShortCode = (name) => {
  if (!name) return '';
  const clean = name.trim().toUpperCase().replace(/[^A-Z0-9\s]/g, '');
  const words = clean.split(/\s+/).filter(w => w.length > 0);
  if (words.length >= 2) {
    return (words[0].substring(0, 2) + words[1].substring(0, 2)).substring(0, 4);
  }
  return words[0].substring(0, 4);
};

const tests = [
  "Mathematics",
  "English Language",
  "Physical Education",
  "Comp. Sci.",
  "Art",
  "Bio"
];

tests.forEach(t => {
  console.log(`${t} -> ${generateShortCode(t)}`);
});

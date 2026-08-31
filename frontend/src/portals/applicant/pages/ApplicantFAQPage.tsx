import { useState } from 'react';
import { useToast } from '../../../context/ToastContext';

interface FAQ {
  id: string;
  category: string;
  question: string;
  answer: string;
}

export default function ApplicantFAQPage() {
  const { showToast } = useToast();
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [openId, setOpenId] = useState<string | null>('faq-1');
  const [questionModal, setQuestionModal] = useState(false);
  const [userQuestion, setUserQuestion] = useState('');

  const faqs: FAQ[] = [
    {
      id: 'faq-1',
      category: 'Registration & Entry',
      question: 'What documents are required for new student application?',
      answer: 'You will need a copy of the applicant’s birth certificate, national ID of parent/guardian, recent passport-size photo, and latest academic progress report from the previous school.'
    },
    {
      id: 'faq-2',
      category: 'Registration & Entry',
      question: 'How do I track the status of my application?',
      answer: 'You can check your application progress anytime by clicking "Check Status" on the applicant portal and entering your reference number or registered national ID.'
    },
    {
      id: 'faq-3',
      category: 'Fees & Payment',
      question: 'Are tuition payment plan options available?',
      answer: 'Yes! The school bursar office offers termly flexible installment plans. You can apply for a payment plan directly through your parent/applicant dashboard under "Payment Plans".'
    },
    {
      id: 'faq-4',
      category: 'Boarding & Hostel',
      question: 'What are the rules and items required for boarding hostel entry?',
      answer: 'Boarding students must bring standard bedding, school uniform sets, personal toiletries, and locked trunk trunks. Electronic entertainment devices are regulated per school policy.'
    },
    {
      id: 'faq-5',
      category: 'Health & Medical',
      question: 'Is there medical insurance or on-site clinic care for students?',
      answer: 'Yes, all enrolled students have full access to the campus medical clinic managed by qualified nursing staff. Emergency cases are referred to our partner medical hospital.'
    }
  ];

  const categories = ['ALL', 'Registration & Entry', 'Fees & Payment', 'Boarding & Hostel', 'Health & Medical'];

  const filteredFaqs = faqs.filter(f => {
    const matchesCat = selectedCategory === 'ALL' || f.category === selectedCategory;
    const matchesSearch = f.question.toLowerCase().includes(search.toLowerCase()) || f.answer.toLowerCase().includes(search.toLowerCase());
    return matchesCat && matchesSearch;
  });

  const handleSubmitQuestion = () => {
    if (!userQuestion.trim()) {
      showToast('Please type your question before submitting.', 'error');
      return;
    }
    showToast('Your question has been sent to admissions! We will reply via email shortly.', 'success');
    setUserQuestion('');
    setQuestionModal(false);
  };

  return (
    <>
      <div className="portal-page-header">
        <div>
          <h1>Applicant Help Center & FAQ</h1>
          <p>Find answers to common questions regarding admissions, fees, requirements, and campus life.</p>
        </div>
        <button className="portal-btn-primary" onClick={() => setQuestionModal(true)}>
          <i className="fas fa-paper-plane portal-mr-6"></i>Ask Admissions Team
        </button>
      </div>

      {/* Search Bar */}
      <div className="portal-card portal-card-mb20">
        <div className="portal-card-body">
          <div className="portal-flex-center-gap12">
            <i className="fas fa-search portal-text-search-icon"></i>
            <input 
              type="text"
              className="portal-input portal-flex-1"
              placeholder="Search frequently asked questions..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Categories */}
      <div className="portal-categories-row">
        {categories.map((cat) => (
          <button
            key={cat}
            className={`${selectedCategory === cat ? 'portal-btn-primary' : 'portal-btn-secondary'} portal-cat-btn`}
            onClick={() => setSelectedCategory(cat)}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* FAQ Accordion */}
      <div className="portal-faq-list">
        {filteredFaqs.length === 0 ? (
          <div className="portal-card portal-empty-card-center">
            <i className="fas fa-question-circle fa-3x portal-empty-icon-muted"></i>
            <h3>No matching questions found</h3>
            <p className="portal-empty-text-muted">Try searching with a different term or submit your question to our admissions team.</p>
          </div>
        ) : (
          filteredFaqs.map((f) => {
            const isOpen = openId === f.id;
            return (
              <div key={f.id} className="portal-card portal-card-mb0">
                <div 
                  className="portal-card-header portal-faq-header"
                  onClick={() => setOpenId(isOpen ? null : f.id)}
                >
                  <div className="portal-faq-title-group">
                    <span className="portal-badge info">{f.category}</span>
                    <h3 className="portal-faq-title">{f.question}</h3>
                  </div>
                  <i className={`fas fa-chevron-${isOpen ? 'up' : 'down'} portal-faq-icon-muted`}></i>
                </div>
                {isOpen && (
                  <div className="portal-card-body portal-faq-answer-body">
                    {f.answer}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Ask Question Modal */}
      {questionModal && (
        <div className="portal-modal-overlay" onClick={() => setQuestionModal(false)}>
          <div className="portal-modal-card portal-modal-max-500" onClick={e => e.stopPropagation()}>
            <div className="portal-card-header portal-card-header-flex-between">
              <h2><i className="fas fa-question-circle portal-icon-primary"></i>Submit Admission Query</h2>
              <button className="portal-btn-ghost" onClick={() => setQuestionModal(false)}>&times;</button>
            </div>
            <div className="portal-card-body">
              <label className="portal-label-bold-sm">Your Question</label>
              <textarea 
                className="portal-input portal-textarea-modal" 
                rows={4} 
                placeholder="Type your question for the school admissions desk..."
                value={userQuestion}
                onChange={e => setUserQuestion(e.target.value)}
              />
              <div className="portal-flex-end-gap10">
                <button className="portal-btn-secondary" onClick={() => setQuestionModal(false)}>Cancel</button>
                <button className="portal-btn-primary" onClick={handleSubmitQuestion}>Submit Question</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

import { Home } from 'lucide-react';

export const CATEGORY_LIST = [
  // Academic & Standardized Tests
  {
    category: 'school-exam',
    categoryName: 'School Exam (K-12)',
    placeholder: 'Biology chapter 5: Cell Division, 10th grade level...',
    group: 'Academic',
  },
  {
    category: 'university-exam',
    categoryName: 'University/College Exam',
    placeholder: 'Organic Chemistry final exam, undergraduate level...',
    group: 'Academic',
  },
  {
    category: 'standardized-test',
    categoryName: 'Standardized Test (SAT, GRE, GMAT)',
    placeholder: 'GRE Quantitative section, focus on algebra and geometry...',
    group: 'Academic',
  },
  {
    category: 'medical-exam',
    categoryName: 'Medical Exam (MCAT, USMLE, NCLEX)',
    placeholder: 'USMLE Step 1, cardiovascular physiology...',
    group: 'Academic',
  },
  {
    category: 'law-exam',
    categoryName: 'Law Exam (LSAT, Bar)',
    placeholder: 'Bar exam prep, constitutional law fundamentals...',
    group: 'Academic',
  },
  {
    category: 'language-proficiency',
    categoryName: 'Language Proficiency (TOEFL, IELTS)',
    placeholder: 'IELTS Academic reading comprehension practice...',
    group: 'Academic',
  },

  // Professional Certifications
  {
    category: 'cloud-certification',
    categoryName: 'Cloud Certification (AWS, GCP, Azure)',
    placeholder: 'AWS Solutions Architect Associate, networking concepts...',
    group: 'Certifications',
  },
  {
    category: 'tech-certification',
    categoryName: 'Tech Certification (Cisco, CompTIA, etc.)',
    placeholder: 'CompTIA Security+ certification, network security...',
    group: 'Certifications',
  },
  {
    category: 'project-management',
    categoryName: 'Project Management (PMP, Scrum)',
    placeholder: 'PMP exam prep, risk management processes...',
    group: 'Certifications',
  },
  {
    category: 'finance-certification',
    categoryName: 'Finance Certification (CFA, CPA, FRM)',
    placeholder: 'CFA Level 1, equity valuation and analysis...',
    group: 'Certifications',
  },

  // Technical Interviews
  {
    category: 'software-engineering',
    categoryName: 'Software Engineering Interview',
    placeholder: 'Senior Frontend Engineer role, React and TypeScript focus...',
    group: 'Interviews',
  },
  {
    category: 'data-structures-algorithms',
    categoryName: 'Data Structures & Algorithms',
    placeholder: 'Coding interview prep, dynamic programming and graphs...',
    group: 'Interviews',
  },
  {
    category: 'system-design',
    categoryName: 'System Design Interview',
    placeholder: 'Distributed systems design, scalability patterns...',
    group: 'Interviews',
  },
  {
    category: 'data-science-ml',
    categoryName: 'Data Science & ML Interview',
    placeholder: 'ML Engineer role, deep learning and NLP concepts...',
    group: 'Interviews',
  },
  {
    category: 'devops-sre',
    categoryName: 'DevOps & SRE Interview',
    placeholder: 'Site Reliability Engineer role, Kubernetes and CI/CD...',
    group: 'Interviews',
  },

  // Business & Non-Tech Interviews
  {
    category: 'product-management',
    categoryName: 'Product Management Interview',
    placeholder: 'Senior PM role at a tech company, product strategy...',
    group: 'Interviews',
  },
  {
    category: 'consulting-case',
    categoryName: 'Consulting & Case Interview',
    placeholder: 'McKinsey case interview, market sizing and strategy...',
    group: 'Interviews',
  },
  {
    category: 'finance-interview',
    categoryName: 'Finance & Banking Interview',
    placeholder: 'Investment banking analyst, valuation methods...',
    group: 'Interviews',
  },
  {
    category: 'behavioral-interview',
    categoryName: 'Behavioral & HR Interview',
    placeholder: 'Leadership scenarios, conflict resolution examples...',
    group: 'Interviews',
  },
  {
    category: 'design-interview',
    categoryName: 'Design Interview (UX/UI)',
    placeholder: 'Product Designer role, design process and portfolio...',
    group: 'Interviews',
  },

  // General Learning & Knowledge
  {
    category: 'programming-language',
    categoryName: 'Programming Language',
    placeholder: 'Python advanced concepts, decorators and generators...',
    group: 'Learning',
  },
  {
    category: 'framework-library',
    categoryName: 'Framework & Library',
    placeholder: 'Next.js App Router, server components and caching...',
    group: 'Learning',
  },
  {
    category: 'science-technology',
    categoryName: 'Science & Technology',
    placeholder: 'Quantum computing basics, qubits and entanglement...',
    group: 'Learning',
  },
  {
    category: 'history-geography',
    categoryName: 'History & Geography',
    placeholder: 'World War II, European theater key events...',
    group: 'Learning',
  },
  {
    category: 'business-economics',
    categoryName: 'Business & Economics',
    placeholder: 'Microeconomics principles, supply and demand...',
    group: 'Learning',
  },
  {
    category: 'language-learning',
    categoryName: 'Language Learning',
    placeholder: 'Spanish vocabulary, present tense conjugation...',
    group: 'Learning',
  },
  {
    category: 'general',
    categoryName: 'General Knowledge',
    placeholder: 'Trivia questions about science, history, and culture...',
    group: 'Learning',
  },
];

export const MENU_ITEMS = [{ name: 'Home', href: '/', icon: Home }];

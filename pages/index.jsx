import Layout from "./Layout.jsx";

import Dashboard from "./Dashboard";

import Contacts from "./Contacts";

import Settings from "./Settings";

import WeeklyPlan from "./WeeklyPlan";

import AIMessaging from "./AIMessaging";

import Progress from "./Progress";

import Events from "./Events";

import SocialPlanner from "./SocialPlanner";

import Resume from "./Resume";

import BlogWriter from "./BlogWriter";

import Interview from "./Interview";

import CareerCoach from "./CareerCoach";

import JobTracker from "./JobTracker";

import Profile from "./Profile";

import ResumeReview from "./ResumeReview";

import Home from "./Home";

import SystemDiagnostics from "./SystemDiagnostics";

import AgentStudio from "./AgentStudio";

import { BrowserRouter as Router, Route, Routes, useLocation } from 'react-router-dom';

const PAGES = {
    
    Dashboard: Dashboard,
    
    Contacts: Contacts,
    
    Settings: Settings,
    
    WeeklyPlan: WeeklyPlan,
    
    AIMessaging: AIMessaging,
    
    Progress: Progress,
    
    Events: Events,
    
    SocialPlanner: SocialPlanner,
    
    Resume: Resume,
    
    BlogWriter: BlogWriter,
    
    Interview: Interview,
    
    CareerCoach: CareerCoach,
    
    JobTracker: JobTracker,
    
    Profile: Profile,
    
    ResumeReview: ResumeReview,
    
    Home: Home,
    
    SystemDiagnostics: SystemDiagnostics,
    
    AgentStudio: AgentStudio,
    
}

function _getCurrentPage(url) {
    if (url.endsWith('/')) {
        url = url.slice(0, -1);
    }
    let urlLastPart = url.split('/').pop();
    if (urlLastPart.includes('?')) {
        urlLastPart = urlLastPart.split('?')[0];
    }

    const pageName = Object.keys(PAGES).find(page => page.toLowerCase() === urlLastPart.toLowerCase());
    return pageName || Object.keys(PAGES)[0];
}

// Create a wrapper component that uses useLocation inside the Router context
function PagesContent() {
    const location = useLocation();
    const currentPage = _getCurrentPage(location.pathname);
    
    return (
        <Layout currentPageName={currentPage}>
            <Routes>            
                
                    <Route path="/" element={<Dashboard />} />
                
                
                <Route path="/Dashboard" element={<Dashboard />} />
                
                <Route path="/Contacts" element={<Contacts />} />
                
                <Route path="/Settings" element={<Settings />} />
                
                <Route path="/WeeklyPlan" element={<WeeklyPlan />} />
                
                <Route path="/AIMessaging" element={<AIMessaging />} />
                
                <Route path="/Progress" element={<Progress />} />
                
                <Route path="/Events" element={<Events />} />
                
                <Route path="/SocialPlanner" element={<SocialPlanner />} />
                
                <Route path="/Resume" element={<Resume />} />
                
                <Route path="/BlogWriter" element={<BlogWriter />} />
                
                <Route path="/Interview" element={<Interview />} />
                
                <Route path="/CareerCoach" element={<CareerCoach />} />
                
                <Route path="/JobTracker" element={<JobTracker />} />
                
                <Route path="/Profile" element={<Profile />} />
                
                <Route path="/ResumeReview" element={<ResumeReview />} />
                
                <Route path="/Home" element={<Home />} />
                
                <Route path="/SystemDiagnostics" element={<SystemDiagnostics />} />
                
                <Route path="/AgentStudio" element={<AgentStudio />} />
                
            </Routes>
        </Layout>
    );
}

export default function Pages() {
    return (
        <Router>
            <PagesContent />
        </Router>
    );
}
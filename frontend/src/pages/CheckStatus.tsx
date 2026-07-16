import { Link } from 'react-router-dom';

export default function CheckStatus() {
  return (
    <>
      
    {/* Top Bar */}
    

    <div className="container">
        <div className="login-card">
            <div className="login-header">
                <img src="images/logo.png" alt="School Logo" id="sidebarLogo" className="acadex-school-logo"  />
                <h2 className="acadex-school-name">Applicant Portal</h2>
                <p >Track your admission status</p>
            </div>

            <div id="loginAlert" className="alert"></div>

            <form id="loginForm">
                <div >School Access Code</div>
                <input type="text" className="form-control" id="schoolCode" placeholder="Enter School Code" required />

                <div >Application ID</div>
                <input type="text" className="form-control" id="appId" placeholder="e.g. F1-123456" required />

                <div >Password</div>
                <input type="password" className="form-control" id="password" placeholder="••••••" required />

                <button type="submit" className="btn-login">Secure Login</button>
            </form>

            <div className="info-box">
                <i className="fas fa-lightbulb"></i> <strong>Note:</strong> Check your application confirmation for your
                Login ID and Password.
            </div>

            <Link to="/" className="back-link"><i className="fas fa-arrow-left"></i> Back to Home</Link>
        </div>
    </div>

    
    
    




    </>
  );
}

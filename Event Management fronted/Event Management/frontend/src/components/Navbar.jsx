function Navbar () {
    return (
        <nav className="navbar">
            <div className="logo">
                Eventifty
            </div>

            <div className="nav-links">
                <a href="#">Home</a>
                <a href="#">Events</a>
                <a href="#">About</a>
                <a href="#">Contact</a>
                <button>Login</button>
            </div>
        </nav>
    );
}

export default Navbar;
 import { useState } from "react";
import { Link } from "react-router-dom";
import api from "./api";
import "./Login.css";

export default function Register({ onRegister }) {
  const [form, setForm] = useState({ name:"", email:"", password:"", phone:"" });
  const [message, setMessage] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const submit = async (e) => {
    e.preventDefault(); setMessage("");
    try {
      const {data} = await api.post("/users/register", form);
      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(data.user));
      onRegister(data.user);
    } catch(error) { setMessage(error.response?.data?.message || "Registration failed."); }
  };
  return <main className="auth-page"><section className="auth-card">
    <div className="auth-side"><div className="auth-art">🎟️</div><h2>Join EventHub</h2><p>Create an account and register for events.</p></div>
    <div className="auth-form"><h1>Create Account</h1><p className="subtitle">Enter your details to get started</p>
      {message && <div className="error">{message}</div>}
      <form onSubmit={submit}>
        <label>Name<input required value={form.name} onChange={e=>setForm({...form,name:e.target.value})}/></label>
        <label>Email<input required type="email" value={form.email} onChange={e=>setForm({...form,email:e.target.value})}/></label>
        <label>Phone<input value={form.phone} onChange={e=>setForm({...form,phone:e.target.value})}/></label>
        <label>Password
          <div className="password-input-wrap">
            <input required minLength={6} type={showPassword ? "text" : "password"} autoComplete="new-password" value={form.password} onChange={e=>setForm({...form,password:e.target.value})}/>
            <button type="button" className="password-visibility-btn" onClick={() => setShowPassword(visible => !visible)} aria-label={showPassword ? "Hide password" : "Show password"} aria-pressed={showPassword} title={showPassword ? "Hide password" : "Show password"}>
              {showPassword ? (
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 3l18 18M10.6 10.6a2 2 0 002.8 2.8"/><path d="M9.9 5.2A10.8 10.8 0 0112 5c5.5 0 9 7 9 7a15.7 15.7 0 01-3.1 3.8M6.2 6.2C3.9 7.8 2.5 10 2.5 12c0 0 3.5 7 9.5 7 1.1 0 2.1-.3 3-.7"/></svg>
              ) : (
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2.5 12s3.5-7 9.5-7 9.5 7 9.5 7-3.5 7-9.5 7-9.5-7-9.5-7z"/><circle cx="12" cy="12" r="3"/></svg>
              )}
            </button>
          </div>
        </label>
        <button className="primary-btn full">Create Account</button>
      </form>
      <p className="auth-link">Already have an account? <Link to="/login">Login</Link></p>
    </div>
  </section></main>;
}

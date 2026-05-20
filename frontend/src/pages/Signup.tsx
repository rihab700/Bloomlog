import { FormEvent, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

export default function Signup() {
  const { signup } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    try {
      await signup(email, password, fullName);
      navigate("/login");
    } catch (err) {
      setError("Signup failed. Please check your data.");
    }
  };

  return (
    <div className="page-container">
      <div className="card">
        <h1>Sign up</h1>
        <form onSubmit={handleSubmit}>
          <label>
            Full name
            <input value={fullName} onChange={(event) => setFullName(event.target.value)} />
          </label>
          <label>
            Email
            <input value={email} onChange={(event) => setEmail(event.target.value)} required />
          </label>
          <label>
            Password
            <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} required />
          </label>
          {error && <div className="error">{error}</div>}
          <button type="submit">Create account</button>
        </form>
        <div className="secondary">
          Already registered? <Link to="/login">Log in</Link>
        </div>
      </div>
    </div>
  );
}

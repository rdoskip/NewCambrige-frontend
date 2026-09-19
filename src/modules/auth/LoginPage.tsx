import { useState } from "react";
import { useAuth } from "../../api/AuthContext";
import bgImage from "../../assets/Fondo_login.jpg";
import styles from "./LoginPage.module.css";

export default function LoginPage() {
  const [usuario, setUsuario] = useState("");
  const [contrasena, setContrasena] = useState("");
  const [errorLocal, setErrorLocal] = useState("");
  const [showPopup, setShowPopup] = useState(false);

  const { login, loading, sessionMessage, setSessionMessage } = useAuth();

  const closePopup = () => {
    setShowPopup(false);
    setSessionMessage("");
  };

  // El mensaje de sesión viene del AuthProvider (eventos). Si existe, mostramos popup.
  if (sessionMessage && !showPopup) setShowPopup(true);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrorLocal("");
    if (!usuario || !contrasena) {
      setErrorLocal("Por favor, completa todos los campos.");
      return;
    }
    try {
      await login(usuario, contrasena);
    } catch (err: any) {
      const status = err.response?.status;
      if (status === 429 || status === 403) return; // popup ya mostrado
      setErrorLocal("Usuario o contraseña incorrectos.");
    }
  };

  const popupTitle = () => {
    if (!sessionMessage) return "Aviso";
    if (/intentos|demasiados/i.test(sessionMessage)) return "Demasiados Intentos";
    if (/inactivo/i.test(sessionMessage)) return "Cuenta Inactiva";
    return "Sesión Finalizada";
  };

  return (
    <>
      {showPopup && sessionMessage && (
        <div className={styles["popup-overlay"]}>
          <div className={styles["popup-card"]}>
            <div className={styles["popup-header"]}>
              <h2>{popupTitle()}</h2>
            </div>
            <div className={styles["popup-body"]}>
              <p>{sessionMessage}</p>
            </div>
            <div className={styles["popup-footer"]}>
              <button className={styles["popup-btn"]} onClick={closePopup}>
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      <div
        className={styles["login-root"]}
        style={{ backgroundImage: `url(${bgImage})` }}
      >
        <div className={styles["login-card"]}>
          <h1 className={styles["login-title"]}>Iniciar Sesión</h1>
          <form onSubmit={handleSubmit} noValidate>
            <div className={styles["input-group"]}>
              <span className={styles["input-icon"]}>
                <svg viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z" />
                </svg>
              </span>
              <input
                className={styles["input-field"]}
                type="text"
                placeholder="Documento"
                value={usuario}
                onChange={(e) => setUsuario(e.target.value)}
                autoComplete="username"
                autoFocus
              />
            </div>

            <div className={styles["input-group"]}>
              <span className={styles["input-icon"]}>
                <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path d="M18 8h-1V6A5 5 0 0 0 7 6v2H6a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V10a2 2 0 0 0-2-2zm-6 9a2 2 0 1 1 0-4 2 2 0 0 1 0 4zm3.1-9H8.9V6a3.1 3.1 0 0 1 6.2 0v2z" />
                </svg>
              </span>
              <input
                className={styles["input-field"]}
                type="password"
                placeholder="Contraseña"
                value={contrasena}
                onChange={(e) => setContrasena(e.target.value)}
                autoComplete="current-password"
              />
            </div>

            {errorLocal && <p className={styles["login-error"]}>{errorLocal}</p>}

            <button
              className={styles["login-btn"]}
              type="submit"
              disabled={loading}
            >
              {loading && <span className={styles["btn-spinner"]} />}
              {loading ? "Accediendo..." : "Acceder"}
            </button>
          </form>
        </div>
      </div>
    </>
  );
}
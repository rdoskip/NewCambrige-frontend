export const SESSION_EXPIRED_EVENT = "session:expired";
export const LOGIN_BLOCKED_EVENT = "login:blocked";

export const emitSessionExpired = (detail = "Sesión expirada") => {
    window.dispatchEvent(
    new CustomEvent(SESSION_EXPIRED_EVENT, { detail })
    );
};

export const emitLoginBlocked = (message) => {
    window.dispatchEvent(
    new CustomEvent(LOGIN_BLOCKED_EVENT, { detail: { message } })
    );
};
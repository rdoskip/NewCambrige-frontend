import "./ModuleLayout.css";

export default function ModuleLayout({ sidebar, actions, children }) {
  return (
    <div className="module-layout">
      <div className="module-sidebar">{sidebar}</div>

      <div className="module-content">
        <div className="module-body">
          <div className="module-children">{children}</div>
          {actions && <div className="module-actions">{actions}</div>}
        </div>
      </div>
    </div>
  );
}
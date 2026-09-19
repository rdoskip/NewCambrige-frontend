import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Home } from "lucide-react";
import "./ParametrizacionPage.css";

// ==========================================
// IMPORTACIONES DE COMPONENTES
// ==========================================
import Header from "../../components/layout/header";
import Sidebar from "../../components/layout/Sidebar";
import ModuleLayout from "../../components/layout/ModuleLayout";
import { useAuth } from "../../api/AuthContext";

// ==========================================
// IMPORTACIONES DE ICONOS
// ==========================================
import { Icon } from '@mdi/react';
import {
  // Iconos para el menú lateral
  mdiHome,
  mdiViewDashboard,
  mdiSchool,
  mdiTshirtCrew,
  mdiCash,
  mdiAccountSchool,
  mdiCog,

  // Iconos para las tarjetas 
  mdiAccount,
  mdiCalendar,
  mdiTestTube,
  mdiGuitarElectric,
  mdiCube,
  mdiBook,
  mdiAccountGroup,
} from '@mdi/js';

// ==========================================
// COMPONENTE PRINCIPAL
// ==========================================
const ParametrizacionPage = () => {
  const { user, roles, loadingRoles, logout } = useAuth();
  const navigate = useNavigate();
  
  const userName = user?.nombre || "Usuario";
  const rol = roles[0] || (loadingRoles ? "Cargando rol..." : "Sin rol");
  const [selectedMenu, setSelectedMenu] = useState("Parametrización");

  // ==========================================
  // CONFIGURACIÓN DEL MENÚ Y TARJETAS
  // ==========================================
  const menuItems = [
    { label: "Inicio", icon: <Icon path={mdiHome} size="32px" />, path: "/home" },
    { label: "Parametrización", icon: <Icon path={mdiCog} size="32px" />, path: "/parametrizacion" },
  ];

  const cards = [
    { title: "Usuarios", iconPath: mdiAccount, path: "/parametrizacion/usuarios" },
    { title: "Año escolar", iconPath: mdiCalendar, path: "/parametrizacion/anio-escolar" },
    { title: "Pruebas", iconPath: mdiTestTube, path: "/parametrizacion/pruebas" },
    { title: "Instrumentos", iconPath: mdiGuitarElectric, path: "/parametrizacion/instrumentos" },
    { title: "Objetos", iconPath: mdiCube, path: "/parametrizacion/objetos" },
    { title: "Libros", iconPath: mdiBook, path: "/parametrizacion/libros" },
    { title: "Asignar titulares", iconPath: mdiAccountGroup, path: "/parametrizacion/titulares" },
  ];

  // ==========================================
  // RENDERIZADO DE LA VISTA
  // ==========================================
  return (
    <div className="dashboard-container">
      <Header title="SISTEMA DE PAZ Y SALVO - NEW CAMBRIDGE SCHOOL" />
      <ModuleLayout
        sidebar={
          <Sidebar
            menuItems={menuItems}
            selectedMenu={selectedMenu}
            setSelectedMenu={(menu) => {
               setSelectedMenu(menu);
               const itemSeleccionado = menuItems.find(m => m.label === menu);
               if (itemSeleccionado && itemSeleccionado.path) {
                   navigate(itemSeleccionado.path);
               }
            }}
            user={{ nombre: userName, rol }}
            loadingRoles={loadingRoles}
            logout={logout}
          />
        }
      >
        <div className="param-page-content">
          <div className="param-grid-container">
            {cards.map((card, index) => (
              <button 
                key={index} 
                className="param-card" 
                onClick={() => navigate(card.path)}
              >
                <div className="param-icon-wrapper">
                  <Icon 
                    path={card.iconPath} 
                    size="42px"
                    color="#b89130"
                    className="param-icon"
                  />
                </div>
                <span className="param-title">{card.title}</span>
              </button>
            ))}
          </div>
        </div>
      </ModuleLayout>
    </div>
  );
};

export default ParametrizacionPage;
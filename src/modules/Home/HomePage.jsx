import { useState } from "react";
import { Icon } from '@mdi/react';

/*importacion de iconos*/ 
import { mdiHome, mdiViewDashboard } from '@mdi/js';
import "./HomePage.css";
import salonIcon from "../../assets/Salon/salon.svg";
import tesoreriaIcon from "../../assets/Tesoreria/tesoreria.svg";
import rectoriaIcon from "../../assets/Rectoria/estudiante.svg";
import uniformesIcon from "../../assets/Objetos/objetos.svg";
import bandaIcon from "../../assets/Banda/banda.svg";
import paraIcon from "../../assets/Parametrizacion/parametrizacion.svg";
import DashboardIcon from "../../assets/Parametrizacion/parametrizacion.svg";
import importacionIcon from "../../assets/importacion/Robot 1941.svg";
import Header from "../../components/layout/header";
import Sidebar from "../../components/layout/Sidebar";
import ModuleLayout from "../../components/layout/ModuleLayout";
import CardsGrid from "../../components/layout/CardsGrid";


import { useAuth } from "../../api/AuthContext";
import { useNavigate } from 'react-router-dom';


const HomePage = () => {
  const { user, roles, loadingRoles, logout } = useAuth();
  const [selectedMenu, setSelectedMenu] = useState("Inicio");
  const navigate = useNavigate();

  const userName = user?.nombre || "Usuario";
  const rol = roles[0] || "Rol Desconocido";

  const menuItems = [
    { label: "Inicio", icon: <Icon path={mdiHome} /> },
    { label: "Dashboard", path: "/dashboard", icon: <Icon path={mdiViewDashboard} /> },
  ];

  const cards = [
    { title: "Salón", icon: salonIcon, path: "/salon", roles: ["admin", "titular"] },
    { title: "Tesorería", icon: tesoreriaIcon, path: "/tesoreria", roles: [ "admin", "tesoreria", ] },
    { title: "Rectoría", icon: rectoriaIcon, path: "/rectoria", roles: ["admin", "rectoria"] },
    { title: "Uniformes", icon: uniformesIcon, path: "/uniformes", roles: ["admin", "uniformes"] },
    { title: "Banda", icon: bandaIcon, path: "/banda", roles: ["admin", "banda"] },
    { title: "Parametrización", icon: paraIcon, path: "/parametrizacion", roles: ["admin", "rectoria"] },
    { title: "Robot", icon: importacionIcon, path: "/importacion", roles: ["admin"] },
  ];

  const handleCardClick = (path) => {
    if (path) navigate(path);
  };

  return (
    <div className="dashboard-container">
      <Header title="SISTEMA DE PAZ Y SALVO - NEW CAMBRIDGE SCHOOL" />
      <ModuleLayout
        sidebar={
          <Sidebar
            menuItems={menuItems}
            selectedMenu={selectedMenu}
            setSelectedMenu={setSelectedMenu}
            user={{ nombre: userName, rol }}
            loadingRoles={loadingRoles}
            logout={logout}
          />
        }
      >
        <CardsGrid
          cards={cards}
          roles={roles}
          onCardClick={handleCardClick}
          loading={loadingRoles}
        />
      </ModuleLayout>
    </div>
  );
};

export default HomePage;
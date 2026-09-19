// src/pages/Tesoreria/Tesoreria.js
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Icon } from '@mdi/react';
import { mdiHome, mdiCash, mdiBell } from "@mdi/js";
import { useAuth } from "../../api/AuthContext";
import Header from "../../components/layout/header";
import ModuleLayout from "../../components/layout/ModuleLayout";
import Sidebar from "../../components/layout/Sidebar";
import CardsGrid from "../../components/layout/CardsGrid";

import MatriculaLogo from '../../assets/Tesoreria/matricula.svg';
import PensionLogo from '../../assets/Tesoreria/pension.svg';
import PapeleriaLogo from '../../assets/Tesoreria/papeleria.svg';

import "./Tesoreria.css"; // Opcional: si quieres estilos específicos

const Tesoreria = () => {
  const navigate = useNavigate();
  const { user, roles, loadingRoles, logout } = useAuth();
  const userName = user?.nombre || "Usuario";
  const rol = roles[0] || (loadingRoles ? "Cargando rol..." : "Sin rol");
  const selectedMenu = "Tesorería";

  // Cards (submódulos de tesorería)
  const cards = [
    { title: 'Matrícula', icon: MatriculaLogo, path: "/tesoreria/matricula", roles: ["admin", "tesoreria"] },
    { title: 'Pensión', icon: PensionLogo, path: "/tesoreria/pension", roles: ["admin", "tesoreria"] },
    { title: 'Papelería', icon: PapeleriaLogo, path: "/tesoreria/papeleria", roles: ["admin", "tesoreria"] },
  ];

  // Items del sidebar (con roles para filtrar)
  const modulos = [
    { label: "Inicio", icon: <Icon path={mdiHome} />, path: "/home" },
    { label: "Tesorería", icon: <Icon path={mdiCash} />, path: "/tesoreria/", roles: ["admin", "tesoreria"] },
  ];

  // Filtrar los módulos del sidebar según los roles del usuario
  const sidebarMenuItems = modulos.filter(modulo => {
    if (!modulo) return false;
    if (!modulo.roles || !Array.isArray(modulo.roles) || modulo.roles.length === 0) return true;
    return roles.some(rol => modulo.roles.includes(rol));
  });

  const handleCardClick = (path) => {
    if (path) navigate(path);
  };

  return (
    <div className="dashboard-container">
      <Header title="SISTEMA DE PAZ Y SALVO - NEW CAMBRIDGE SCHOOL" />
      <ModuleLayout
        sidebar={
          <Sidebar
            menuItems={sidebarMenuItems}
            selectedMenu={selectedMenu}
            user={{ nombre: userName, rol }}
            loadingRoles={loadingRoles}
            logout={logout}
          />
        }
      >
        <div className="tesoreria-content">
          <CardsGrid
            cards={cards}
            roles={roles}
            onCardClick={handleCardClick}
            loading={loadingRoles}
          />
        </div>
      </ModuleLayout>
    </div>
  );
};

export default Tesoreria;
import { useNavigate } from "react-router-dom";
import { Home } from "lucide-react";
import { useAuth } from "../../api/AuthContext";
import Header from "../../components/layout/header";
import ModuleLayout from "../../components/layout/ModuleLayout";
import Sidebar from "../../components/layout/Sidebar";
import CardsGrid from "../../components/layout/CardsGrid";

import PupitresIcon from "../../assets/Salon/pupitres.svg";
import BibliotecaIcon from "../../assets/Salon/biblioteca.svg";
import PruebasIcon from "../../assets/Salon/pruebas.svg";

import { Icon } from '@mdi/react';
import {
mdiSchool,          
} from '@mdi/js';


import "./SalonPage.css";

export default function SalonPage() {
  const navigate = useNavigate();
  const { user, roles, loadingRoles, logout } = useAuth();
  const userName = user?.nombre || "Usuario";
  const rol = roles[0] || (loadingRoles ? "Cargando rol..." : "Sin rol");
  const selectedMenu = "Salón";

  const modulos = [
    { label: "Inicio", icon: <Home />, path: "/home" , roles: ["titular ", "admin"]},
    { label: "Salón", icon: <Icon path={mdiSchool} size={1} />, path: "/salon/", roles: ["admin", "titular"] },
  ];

  const menuItems = modulos.filter(modulo => {
    if (!modulo) return false;
    if (!modulo.roles || !Array.isArray(modulo.roles) || modulo.roles.length === 0) return true;
    return roles.some(r => modulo.roles.includes(r));
  });

  const cards = [
    { title: "Pupitres",   icon: PupitresIcon,   path: "/salon/pupitre",    roles: ["admin", "titular"] },
    { title: "Biblioteca", icon: BibliotecaIcon, path: "/salon/biblioteca", roles: ["admin", "titular"] },
    { title: "Pruebas",    icon: PruebasIcon,    path: "/salon/pruebas",    roles: ["admin", "titular"] },
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
            user={{ nombre: userName, rol }}
            loadingRoles={loadingRoles}
            logout={logout}
          />
        }
      >
        <div className="salon-content">
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
}
import React from "react";
import { useNavigate } from "react-router-dom";
import Icon from "../../components/common/Icon";
import { mdiHome, mdiRobot } from '@mdi/js';

import ModuleLayout from "../../components/layout/ModuleLayout";
import Sidebar from "../../components/layout/Sidebar";
import Header from "../../components/layout/header";
import CardsGrid from "../../components/layout/CardsGrid";

import "./Importacion.css";

import { useAuth } from "../../api/AuthContext";

// Eliminamos lucide-react y prepararemos las imágenes que enviaste
// Por favor, guarda las dos imágenes en la carpeta src/assets/importacion/ con estos nombres:
import iconEstudiante from "../../assets/importacion/estudiante.svg";
import iconDocente from "../../assets/importacion/docente.svg";

export default function ImportacionPage() {
  const navigate = useNavigate();
  const { user, roles, loadingRoles, logout } = useAuth();
  
  const userName = user?.nombre || "Usuario";
  const rol = roles[0] || (loadingRoles ? "Cargando rol..." : "Sin rol");
  const selectedMenu = "Robot";

  const menuItems = [
    { label: "Inicio", path: "/home", icon: <Icon icon={mdiHome} size={1.2} /> },
    { label: "Robot", path: "/importacion", icon: <Icon icon={mdiRobot} size={1.2} /> },
  ];

  const cards = [
    { title: "Estudiante", icon: iconEstudiante, path: "/importacion/estudiante", roles: ["admin"] },
    { title: "Docente", icon: iconDocente, path: "/importacion/docente", roles: ["admin"] },
  ];

  const handleCardClick = (path) => {
    navigate(path);
  };

  // useEffect para forzar el fondo blanco en el contenedor padre (module-content)
  React.useEffect(() => {
    const moduleContent = document.querySelector('.module-content');
    if (moduleContent) {
      moduleContent.style.backgroundColor = '#FFFFFF';
      moduleContent.style.margin = '0';
      moduleContent.style.borderRadius = '0';
    }
    return () => {
      // Limpiar al salir
      if (moduleContent) {
        moduleContent.style.backgroundColor = '';
        moduleContent.style.margin = '';
        moduleContent.style.borderRadius = '';
      }
    };
  }, []);

  return (
    <div>
      <Header title="SISTEMA DE PAZ Y SALVO - NEW CAMBRIGDE SCHOOL" />
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
        <div className="importacion-content">
          <CardsGrid 
            cards={cards} 
            roles={roles} 
            loading={loadingRoles} 
            onCardClick={handleCardClick} 
          />
        </div>
      </ModuleLayout>
    </div>
  );
}

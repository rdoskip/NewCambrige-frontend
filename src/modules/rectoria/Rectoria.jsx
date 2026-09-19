import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useState, useEffect } from "react";
import { useAuth } from "../../api/AuthContext";
import { allrolesuserRequest } from '../../api/endpoints';
import { Home } from "lucide-react";
import EstudianteLogo from '../../assets/Rectoria/estudiante.svg';
import DocenteLogo from '../../assets/Rectoria/docente.svg';
import Header from "../../components/layout/header";
import ModuleLayout from "../../components/layout/ModuleLayout";
import Sidebar from "../../components/layout/Sidebar";
import { Icon } from '@mdi/react';
import {mdiHome,mdiSchool} from "@mdi/js";

const Rectoria = () => {
  const selectedMenu = "Rectoria";
  const { user, logout } = useAuth();
  const userName = user?.nombre || "Usuario";
  const idUser = user?.id_usuario;
  const [roles, setRoles] = useState([]);
  const [cargandoRol, setCargandoRol] = useState(true);
  const rol = roles[0] || "Rol Desconocido";
  
  const navigate = useNavigate();
  //para las tarjetas del dashboard
  const cards = [
    { title: 'Estudiantes', icon: EstudianteLogo, path: "/rectoria/estudiantes", roles: ["admin", "rectoria"] },
    { title: 'Docentes', icon: DocenteLogo, path: "/rectoria/docentes", roles: ["admin", "rectoria"] },
  ];
  //para el sidebar
  const modulos = [
    { label: "Inicio", icon: <Icon path={mdiHome} />, path: "/home" },
    { label: "Rectoria", icon: <Icon path={mdiSchool} />, path: "/Rectoria" }

  ];
 
  useEffect(() => {
    const obtenerRoles = async () => {
      if (!idUser) return;
      try {
        setCargandoRol(true);
        const response = await allrolesuserRequest(idUser);

        setRoles(response?.data || []);
      } catch (error) {
        console.error("Error al obtener el rol:", error);
        setRoles([]);
      } finally {
        setCargandoRol(false);
      }
    };

    obtenerRoles();
  }, [idUser]);



  return (
    <div className="dashboard-container">
      <Header title="SISTEMA DE PAZ Y SALVO - NEW CAMBRIDGE SCHOOL" />
      <ModuleLayout
        sidebar={
          <Sidebar
            menuItems={modulos.filter(modulo => {
              if (!modulo) return false;
              if (!modulo.roles || !Array.isArray(modulo.roles) || modulo.roles.length === 0) return true;
              return roles.some(rol => modulo.roles.includes(rol));
            })}
            user={{ nombre: userName, rol: rol }}
            logout={logout}
            selectedMenu={selectedMenu}
          />
        }
      >{cargandoRol ? (
        <div className="text-vinotinto font-serif text-xl italic animate-pulse">
          Verificando credenciales institucionales...
        </div>
      ) : (

        <div className="cards-grid">
          {cards
            .filter(card =>
              card &&
              Array.isArray(card.roles) &&
              card.roles.length > 0 &&
              roles.some(rol => card.roles.includes(rol))
            )
            .map((card) => (
              <div className="dashboard-card" key={card.title} onClick={() => navigate(card?.path)}>
                <h2>{card.title}</h2>
                <div className="card-icon">
                  <img src={card.icon} alt={card.title} />
                </div>
              </div>
            ))}
        </div>
      )}
        {!cargandoRol
          && cards.filter(item => item && Array.isArray(item.roles)
            && roles.some(rol => item.roles.includes(rol))).length === 0
          && (
            <div className="text-gray-400 italic text-center">
              Tu usuario no tiene módulos asignados.
            </div>
          )}

      </ModuleLayout>
    </div>

  );
};

export default Rectoria;
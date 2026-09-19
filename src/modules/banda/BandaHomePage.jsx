import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from "../../api/AuthContext";

import Icon from '@mdi/react';
import { mdiHome, mdiAccountMusic, mdiPiano } from '@mdi/js';
import { Home, LayoutList, ClipboardCheck } from "lucide-react"; 

import ModuleLayout from "../../components/layout/ModuleLayout";
import Sidebar from "../../components/layout/Sidebar";
import Header from "../../components/layout/header";
import "../Home/HomePage.css"; 

import bandaIcon from "../../assets/Banda/banda.svg";

const BandaHomePage = () => {
  const navigate = useNavigate();
  const { user, roles, loading } = useAuth();

  if (loading || !user) return <div className="status-message status-message--loading">Cargando...</div>;

 const menuBanda = [
  { label: "Inicio", path: "/home", icon: <Home size={18} /> },
 
 ];

const primerRol = roles?.[0];
  const rolTexto = typeof primerRol === 'object' ? primerRol.nombre : (primerRol || "Banda");
  
  return (
    <div className="dashboard-container banda-custom-sidebar">
      <Header title="SISTEMA DE PAZ Y SALVO - NEW CAMBRIDGE SCHOOL" />
      
      <ModuleLayout
        sidebar={
          <Sidebar
            selectedMenu="Inicio"
            menuItems={menuBanda}
            user={{ nombre: String(user?.nombre || "Usuario"),
               rol: String(rolTexto) }}
               logout={() => {}}
          />
        }
      >
        <div style={centerWrapperStyle}>
          <div style={{ width: '100%', maxWidth: '331px' }}>
            <div 
              className="dashboard-card" 
              onClick={() => navigate("/banda/prestamos")} 
              style={{ cursor: 'pointer' }}
            >
              <h2>Banda</h2>
              <div className="card-icon">
                <img src={bandaIcon} alt="Banda" />
              </div>
            </div>
          </div>
        </div>
      </ModuleLayout>
    </div>
  );
};

const centerWrapperStyle = {
  display: 'flex',
  justifyContent: 'center', 
  alignItems: 'center',     
  width: '100%',
  height: '100%',           
  minHeight: 'calc(100vh - 200px)', 
  boxSizing: 'border-box',
  padding: '20px'
};

export default BandaHomePage;
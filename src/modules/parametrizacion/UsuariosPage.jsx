import { useState, useEffect, useMemo } from "react";
import "./UsuariosPage.css";

import Header from "../../components/layout/header";
import Sidebar from "../../components/layout/Sidebar";
import ModuleLayout from "../../components/layout/ModuleLayout";
import DataTable from "../../components/shared/DataTable";
import SearchBar from "../../components/shared/searchBar";
import ActionButtons from "../../components/shared/ActionButtons";
import ParamModal from "../../components/shared/ParamModal";
import Alert from "../../components/shared/Alert";
import { useAuth } from "../../api/AuthContext";
import {
  obtenerUsuariosRequest,
  crearUsuarioRequest,
  actualizarUsuarioRequest,
  asignarRolesRequest
} from "../../api/usuariosService";

import { Icon } from '@mdi/react';
import {
  mdiHome, mdiAccount, mdiCalendar, mdiTestTube,
  mdiGuitarElectric, mdiCube, mdiBook, mdiAccountGroup,
} from '@mdi/js';

const mapaRolesFrontendABackend = {
  "Robot": "robot", "Salón": "salon", "Tesorería": "tesoreria",
  "Rectoría": "rectoria", "Uniformes": "uniformes", "Banda": "banda",
  "Parametrización": "parametrizacion", "Dashboard": "dashboard", "Titular": "titular"
};

const mapaRolesBackendAFrontend = Object.fromEntries(
  Object.entries(mapaRolesFrontendABackend).map(([k, v]) => [v, k])
);

const rolesDisponibles = Object.keys(mapaRolesFrontendABackend);

const UsuariosPage = () => {
  const { user, roles, loadingRoles, logout } = useAuth();

  const [usuarios, setUsuarios] = useState([]);
  const [usuarioSeleccionado, setUsuarioSeleccionado] = useState(null);
  const [filtros, setFiltros] = useState({ busqueda: "" });

  const [searchKey, setSearchKey] = useState(0);

  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState("crear");
  const [formValues, setFormValues] = useState({});
  const [alertConfig, setAlertConfig] = useState({ isOpen: false, type: "info", message: "" });

  const showAlert = (type, message) => setAlertConfig({ isOpen: true, type, message });
  const closeAlert = () => setAlertConfig(prev => ({ ...prev, isOpen: false }));

  const cargarUsuarios = async () => {
    try {
      const response = await obtenerUsuariosRequest();
      setUsuarios(response.data || []);
      setUsuarioSeleccionado(null);
    } catch (error) {
      showAlert("error", "Error al cargar la lista de usuarios.");
    }
  };

  useEffect(() => { cargarUsuarios(); }, []);

  const abrirModalCrear = () => {
    setModalMode("crear");
    setFormValues({ nombre: "", documento: "", password: "", roles: [], estado: true });
    setModalOpen(true);
  };

  const abrirModalEditar = () => {
    if (!usuarioSeleccionado) return;
    const rolesLimpios = (usuarioSeleccionado.roles || []).filter(r => r && typeof r === 'string');
    const rolesVisuales = rolesLimpios.map(r => mapaRolesBackendAFrontend[r] || r);
    
    setModalMode("editar");
    setFormValues({
      nombre: usuarioSeleccionado.nombre,
      password: "",
      estado: usuarioSeleccionado.estado ?? true,
      roles: rolesVisuales
    });
    setModalOpen(true);
  };

  const handleModalChange = (key, value) => {
    setFormValues(prev => ({ ...prev, [key]: value }));
  };

  const toggleRol = (rol) => {
    setFormValues(prev => {
      const currentRoles = prev.roles || [];
      const newRoles = currentRoles.includes(rol)
        ? currentRoles.filter(r => r !== rol)
        : [...currentRoles, rol];
      return { ...prev, roles: newRoles };
    });
  };

  const guardarUsuario = async () => {
    try {
      const rolesParaBackend = (formValues.roles || []).map(r => mapaRolesFrontendABackend[r]);

      if (modalMode === "crear") {
        if (!formValues.nombre || !formValues.documento || !formValues.password) {
          return showAlert("warning", "Llena usuario, documento y contraseña.");
        }
        await crearUsuarioRequest({
          nombre: formValues.nombre,
          documento: formValues.documento,
          password: formValues.password,
          roles: rolesParaBackend,
          estado: formValues.estado ?? true
        });
        showAlert("success", "Usuario creado correctamente.");
      } else {
        const payloadBasico = { nombre: formValues.nombre, estado: formValues.estado };
        if (formValues.password) payloadBasico.password = formValues.password;

        await actualizarUsuarioRequest(usuarioSeleccionado.id_usuario, payloadBasico);
        await asignarRolesRequest(usuarioSeleccionado.id_usuario, { roles: rolesParaBackend });
        showAlert("success", "Usuario actualizado correctamente.");
      }

      setModalOpen(false);
      cargarUsuarios();
    } catch (error) {
      showAlert("error", error.response?.data?.detail || "Ocurrió un error al guardar.");
    }
  };

  const menuItems = [
    { label: "Inicio", icon: <Icon path={mdiHome} size="32px" />, path: "/home" },
    { label: "Usuarios", icon: <Icon path={mdiAccount} size="32px" />, path: "/parametrizacion/usuarios" },
    { label: "Año Escolar", icon: <Icon path={mdiCalendar} size="32px" />, path: "/parametrizacion/anio-escolar" },
    { label: "Pruebas", icon: <Icon path={mdiTestTube} size="32px" />, path: "/parametrizacion/pruebas" },
    { label: "Instrumentos", icon: <Icon path={mdiGuitarElectric} size="32px" />, path: "/parametrizacion/instrumentos" },
    { label: "Objetos", icon: <Icon path={mdiCube} size="32px" />, path: "/parametrizacion/objetos" },
    { label: "Libros", icon: <Icon path={mdiBook} size="32px" />, path: "/parametrizacion/libros" },
    { label: "Asignar Titular", icon: <Icon path={mdiAccountGroup} size="32px" />, path: "/parametrizacion/titulares" },
  ];

  const columnasTabla = [
    { key: "id_usuario", label: "Código",
      render: (val) => <span style={{ fontFamily: 'Roboto, sans-serif', fontWeight: 400 }}>{val}</span>
     },
    { key: "nombre", label: "Usuario" },
    { key: "documento", label: "Documento",
      render: (val) => <span style={{ fontFamily: 'Roboto, sans-serif', fontWeight: 400 }}>{val}</span>
    },
    {
      key: "estado",
      label: "Estado",
      render: (val) => <span className={val ? 'badge--ok' : 'badge--no'}>{val ? 'Activo' : 'Inactivo'}</span>
    },
    { key: "rolesStr", label: "Actividades" }
  ];

  const filasProcesadas = useMemo(() => {
    const termino = (filtros.busqueda || "").toLowerCase();
    return usuarios
      .filter(u => u.nombre.toLowerCase().includes(termino) || u.id_usuario.toString().includes(termino))
      .map(u => ({
        ...u,
        rolesStr: (u.roles || [])
          .filter(r => r && typeof r === 'string')
          .map(r => mapaRolesBackendAFrontend[r] || r)
          .join(" - ")
      }));
  }, [usuarios, filtros]);

  const userName = user?.nombre || "Usuario";
  const rol = roles[0] || (loadingRoles ? "Cargando rol..." : "Sin rol");

  return (
    <div className="dashboard-container">
      <Header title="SISTEMA DE PAZ Y SALVO - NEW CAMBRIDGE SCHOOL" />
      <ModuleLayout
        sidebar={<Sidebar menuItems={menuItems} selectedMenu="Usuarios" user={{ nombre: userName, rol }} logout={logout} />}
      >
        <div className="usuarios-wrapper page-master-wrapper">
          
          <div className="module-toolbar-container">
            <SearchBar
              key={searchKey} 
              fields={[{ key: 'busqueda', label: 'Usuario:', type: 'text' }]}
              onSearch={(nuevosFiltros) => {
                setFiltros(nuevosFiltros);
                setSearchKey(prev => prev + 1); 
              }}
              cleanFilter={{ busqueda: "" }}
            />
          </div>

          <div className="main-area">
            <div className="table-layout-wrapper">
              
              <div className="table-main-section">
                <DataTable
                  columns={columnasTabla}
                  rows={filasProcesadas}
                  onRowClick={(fila) => setUsuarioSeleccionado(fila)}
                  emptyText="No se encontraron usuarios con esa búsqueda"
                  pageSize={10}
                />
              </div>

              <div className="side-actions">
                <ActionButtons
                  filaSeleccionada={usuarioSeleccionado}
                  botones={[
                    { label: "Crear Usuario", onClick: abrirModalCrear, siempreActivo: true, variante: "primary" },
                    { label: "Editar Usuario", onClick: abrirModalEditar, siempreActivo: false, variante: "secondary" }
                  ]}
                />
              </div>

            </div>
          </div>
        </div>

        <ParamModal
          title={modalMode === "crear" ? "CREAR USUARIO" : "EDITAR USUARIO"}
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
        >
          {/* MODO CREAR: Usuario y Documento */}
          {modalMode === "crear" && (
            <div style={{ display: "flex", gap: "16px", width: "100%" }}>
              <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
                <label className="modal-label" style={{ paddingTop: 0 }}>Usuario</label>
                <input
                  type="text" className="modal-input"
                  value={formValues.nombre || ""}
                  onChange={(e) => handleModalChange("nombre", e.target.value)}
                />
              </div>
              <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
                <label className="modal-label" style={{ paddingTop: 0 }}>Documento</label>
                <input
                  type="text" className="modal-input"
                  value={formValues.documento || ""}
                  onChange={(e) => handleModalChange("documento", e.target.value)}
                />
              </div>
            </div>
          )}

          {/* MODO EDITAR: Solo Usuario */}
          {modalMode === "editar" && (
            <div style={{ display: "flex", gap: "16px", width: "100%" }}>
              <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
                <label className="modal-label" style={{ paddingTop: 0 }}>Usuario</label>
                <input
                  type="text" className="modal-input"
                  value={formValues.nombre || ""}
                  onChange={(e) => handleModalChange("nombre", e.target.value)}
                />
              </div>
            </div>
          )}

          {/* Fila 2: Contraseña y Estado */}
          <div style={{ display: "flex", gap: "16px", width: "100%", marginTop: "16px", alignItems: "flex-end" }}>
            <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
              <label className="modal-label" style={{ paddingTop: 0 }}>Contraseña</label>
              <input
                type="password" className="modal-input"
                placeholder={modalMode === "editar" ? "Dejar en blanco para no cambiar..." : ""}
                value={formValues.password || ""}
                onChange={(e) => handleModalChange("password", e.target.value)}
              />
            </div>
            <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
              <label className="modal-label" style={{ paddingTop: 0 }}>Estado</label>
              <div style={{ display: "flex", alignItems: "center", gap: "10px", marginTop: "6px", paddingBottom: "2px" }}>
                <label className="modal-label" style={{ padding: 0, margin: 0, minWidth: "65px" }}>
                  {formValues.estado ? "Activo" : "Inactivo"}
                </label>
                <label className="usuarios-toggle-switch" style={{ margin: 0 }}>
                  <input
                    type="checkbox"
                    checked={formValues.estado ?? true}
                    onChange={(e) => handleModalChange("estado", e.target.checked)}
                  />
                  <span className="usuarios-slider"></span>
                </label>
              </div>
            </div>
          </div>

          {/* Sección de Roles/Actividades */}
          <div className="usuarios-roles-section" style={{ marginTop: "35px" }}>
            <h4 className="usuarios-roles-title" style={{ marginBottom: "15px" }}>ACTIVIDADES</h4>
            <div className="usuarios-roles-grid">
              {rolesDisponibles.map(rol => (
                <button
                  key={rol}
                  className={`usuarios-rol-btn ${(formValues.roles || []).includes(rol) ? "active" : ""}`}
                  onClick={(e) => { e.preventDefault(); toggleRol(rol); }}
                >
                  {rol}
                </button>
              ))}
            </div>
          </div>

          {/* Botones de Acción */}
          <div className="modal-actions" style={{ marginTop: "35px" }}>
            <button className="modal-btn modal-btn--accept" onClick={guardarUsuario}>Aceptar</button>
            <button className="modal-btn modal-btn--cancel" onClick={() => setModalOpen(false)}>Cancelar</button>
          </div>
        </ParamModal>

        <Alert {...alertConfig} onClose={closeAlert} />
      </ModuleLayout>
    </div>
  );
};

export default UsuariosPage;
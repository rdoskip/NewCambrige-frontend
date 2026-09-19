import { useState, useEffect, useMemo } from "react";
import "./AsignacionTitularesPage.css";

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
  obtenerTitularesRequest, 
  obtenerSalonesPorPeriodoRequest, 
  asignarTitularRequest,
  obtenerAniosRequest,
  crearSalonRequest
} from "../../api/endpointsParametrizacion";

import { Icon } from '@mdi/react';
import {
  mdiHome, mdiAccount, mdiCalendar, mdiTestTube,
  mdiGuitarElectric, mdiCube, mdiBook, mdiAccountGroup,
} from '@mdi/js';

const NOMBRES_GRADOS = [
  "Transicion", "Primero", "Segundo", "Tercero", "Cuarto", 
  "Quinto", "Sexto", "Septimo", "Octavo", "Noveno", 
  "Decimo", "Once", "Jardin", "Parvulos", "Prejardin"
];

const AsignacionTitularesPage = () => {
  const { user, roles, loadingRoles, logout } = useAuth();
  
  const [titulares, setTitulares] = useState([]);
  const [salones, setSalones] = useState([]);
  const [idPeriodoActivo, setIdPeriodoActivo] = useState(null);
  const [titularTablaSelec, setTitularTablaSelec] = useState(null);
  
  const [filtroGrado, setFiltroGrado] = useState("");
  const [busquedaActiva, setBusquedaActiva] = useState(null); 

  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState("crear"); 
  const [formValues, setFormValues] = useState({});
  const [cargandoAccion, setCargandoAccion] = useState(false);

  const [salonesTemp, setSalonesTemp] = useState([]);
  
  const [alertConfig, setAlertConfig] = useState({ isOpen: false, type: "info", message: "", onClose: null, onCancel: null });
  const closeAlert = () => setAlertConfig(prev => ({ ...prev, isOpen: false }));
  const showAlert = (type, message, title = "", customConfig = {}) => {
    setAlertConfig({ isOpen: true, type, message, title, onClose: closeAlert, onCancel: null, ...customConfig });
  };

  const cargarDatos = async () => {
    try {
      const resAnios = await obtenerAniosRequest();
      const periodoAct = resAnios.data.find(a => a.activo === true);
      const idPer = periodoAct ? periodoAct.id_periodo : 1;
      setIdPeriodoActivo(idPer);

      const [resTitulares, resSalones] = await Promise.all([
        obtenerTitularesRequest(),
        obtenerSalonesPorPeriodoRequest(idPer)
      ]);
      setTitulares(resTitulares.data || []);
      setSalones(resSalones.data || []);
    } catch (error) {
      showAlert("error", "Error al cargar la información del servidor.");
    }
  };

  useEffect(() => { cargarDatos(); }, []);

  const gradosUnicosBusqueda = useMemo(() => [...new Set(salones.map(s => s.grado))], [salones]);
  const gruposDisponiblesBusqueda = useMemo(() => salones.filter(s => s.grado === filtroGrado), [salones, filtroGrado]);
  
  const gradosUnicosModal = useMemo(() => [...new Set(salones.map(s => s.grado))], [salones]);
  const gruposDisponiblesModal = useMemo(() => salones.filter(s => s.grado === formValues.grado), [salones, formValues.grado]);

  const handleBusqueda = (filtros) => {
    setBusquedaActiva({ 
      titular: (filtros.titular || "").trim().toLowerCase(), 
      grado: filtros.grado || "", 
      grupo: filtros.grupo || "" 
    });
    setTitularTablaSelec(null);
    setFiltroGrado(""); 
  };

  const datosTabla = useMemo(() => {
    let filtrados = titulares.map(titular => {
      const salonesAsignados = salones.filter(s => s.id_usuario === titular.id_usuario);
      return {
        ...titular,
        salones_asignados: salonesAsignados,
        asignaciones_str: salonesAsignados.length > 0 
          ? salonesAsignados.map(s => `${s.grado} - ${s.grupo}`).join(", ") : "Sin asignar"
      };
    });

    if (busquedaActiva) {
      if (busquedaActiva.titular) filtrados = filtrados.filter(t => t.nombre.toLowerCase().includes(busquedaActiva.titular));
      if (busquedaActiva.grado) filtrados = filtrados.filter(t => t.salones_asignados.some(s => s.grado === busquedaActiva.grado));
      if (busquedaActiva.grupo) filtrados = filtrados.filter(t => t.salones_asignados.some(s => s.grupo === busquedaActiva.grupo));
    }
    return filtrados;
  }, [titulares, salones, busquedaActiva]);

  useEffect(() => {
    if (modalOpen && modalMode !== "crearSalon" && formValues.id_usuario) {
      const asignadosOriginales = salones.filter(s => s.id_usuario === parseInt(formValues.id_usuario));
      setSalonesTemp(asignadosOriginales);
    } else if (modalOpen && !formValues.id_usuario) {
      setSalonesTemp([]);
    }
  }, [modalOpen, formValues.id_usuario, salones, modalMode]);

  const abrirModalCrearSalon = () => {
    setTitularTablaSelec(null); 
    setModalMode("crearSalon");
    setFormValues({ grado: "", grupo: "", id_usuario: "" });
    setModalOpen(true);
  };

  const abrirModalAsignar = () => {
    setTitularTablaSelec(null); 
    setModalMode("crear");
    setFormValues({ id_usuario: "", grado: "", grupo: "" });
    setModalOpen(true);
  };

  const abrirModalEditarAsignacion = () => {
    if (!titularTablaSelec) return;
    setModalMode("editar");
    setFormValues({ id_usuario: titularTablaSelec.id_usuario.toString(), grado: "", grupo: "" });
    setModalOpen(true);
  };

  const handleModalChange = (key, value) => {
    setFormValues(prev => ({ ...prev, [key]: value }));
  };

  const handleAddSalonTemp = () => {
    if (!formValues.id_usuario) return showAlert("warning", "Seleccione un Titular primero.");
    if (!formValues.grado || !formValues.grupo) return;
    
    const salonTarget = gruposDisponiblesModal.find(s => s.grupo === formValues.grupo);
    if (!salonTarget) return;

    if (salonesTemp.some(s => s.id_salon === salonTarget.id_salon)) {
      return showAlert("warning", "Este salón ya está asignado en la lista temporal.");
    }

    if (salonTarget.id_usuario && salonTarget.id_usuario !== parseInt(formValues.id_usuario)) {
      const otroTitular = titulares.find(t => t.id_usuario === salonTarget.id_usuario);
      const nombreOtro = otroTitular ? otroTitular.nombre : "otro docente";

      return showAlert(
        "warning", 
        `El Grado ${salonTarget.grado} - Grupo ${salonTarget.grupo} ya se encuentra asignado a ${nombreOtro}. \n\n¿Deseas reasignarlo a este titular?`, 
        "SALÓN YA ASIGNADO", 
        {
          acceptText: "Sí, reasignar",
          cancelText: "Cancelar",
          onCancel: closeAlert,
          onClose: () => {
            closeAlert();
            setSalonesTemp(prev => [...prev, salonTarget]);
            setFormValues(prev => ({ ...prev, grado: "", grupo: "" }));
          }
        }
      );
    }

    setSalonesTemp([...salonesTemp, salonTarget]);
    setFormValues(prev => ({ ...prev, grado: "", grupo: "" }));
  };

  const handleRemoveSalonTemp = (salonTarget) => {
    setSalonesTemp(salonesTemp.filter(s => s.id_salon !== salonTarget.id_salon));
  };

  const handleGuardarAsignaciones = async () => {
    if (!formValues.id_usuario) {
      return showAlert("warning", "Seleccione un Titular primero.");
    }

    const idUsuarioActual = parseInt(formValues.id_usuario);
    const salonesOriginales = salones.filter(s => s.id_usuario === idUsuarioActual);

    const toAdd = salonesTemp.filter(temp => !salonesOriginales.some(orig => orig.id_salon === temp.id_salon));
    const toRemove = salonesOriginales.filter(orig => !salonesTemp.some(temp => temp.id_salon === orig.id_salon));

    if (toAdd.length === 0 && toRemove.length === 0) {
      setModalOpen(false); 
      return;
    }

    try {
      setCargandoAccion(true);
      const promesas = [];

      toAdd.forEach(salon => {
        promesas.push(asignarTitularRequest(salon.id_salon, { id_usuario: idUsuarioActual }));
      });

      toRemove.forEach(salon => {
        promesas.push(asignarTitularRequest(salon.id_salon, { id_usuario: null }));
      });

      await Promise.all(promesas);

      showAlert("success", "Asignaciones actualizadas correctamente.");
      setModalOpen(false);
      cargarDatos();
    } catch (error) {
      showAlert("error", error.response?.data?.detail || "Error al actualizar las asignaciones.");
    } finally {
      setCargandoAccion(false);
    }
  };

  const handleCrearSalonSubmit = async () => {
    if (!formValues.grado || !formValues.grupo || !formValues.id_usuario) {
      return showAlert("warning", "Todos los campos son obligatorios para crear un salón.");
    }
    try {
      const payload = {
        grado: formValues.grado.trim(),
        grupo: formValues.grupo.trim(),
        id_usuario: parseInt(formValues.id_usuario),
        id_periodo: idPeriodoActivo
      };
      await crearSalonRequest(payload);
      showAlert("success", "Salón creado y asignado exitosamente.");
      setModalOpen(false);
      cargarDatos();
    } catch (error) {
      showAlert("error", error.response?.data?.detail || "Error al crear el salón.");
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
    { key: "nombre", label: "Titular" },
    { key: "asignaciones_str", label: "Asignaciones",
      render: (val) => <span style={{ fontFamily: 'Roboto, sans-serif', fontWeight: 400 }}>{val}</span>
     }
  ];

  const userName = user?.nombre || "Usuario";
  const rol = roles[0] || (loadingRoles ? "Cargando rol..." : "Sin rol");

  return (
    <div className="dashboard-container">
      <Header title="SISTEMA DE PAZ Y SALVO - NEW CAMBRIDGE SCHOOL" />
      <ModuleLayout
        sidebar={<Sidebar menuItems={menuItems} selectedMenu="Asignar Titular" user={{ nombre: userName, rol }} loadingRoles={loadingRoles} logout={logout} />}
      >
        <div className="asignaciones-wrapper page-master-wrapper">
          
          <div className="module-toolbar-container">
            <SearchBar
              fields={[
                { key: 'titular', label: 'Titular:', type: 'text' },
                { key: 'grado', label: 'Grado:', type: 'select', options: gradosUnicosBusqueda },
                { key: 'grupo', label: 'Grupo:', type: 'select', options: gruposDisponiblesBusqueda.map(s => s.grupo) }
              ]}
              onChange={(key, value) => {
                if (key === 'grado') setFiltroGrado(value);
              }}
              onSearch={handleBusqueda}
              cleanFilter={{ titular: "", grado: "", grupo: "" }}
            />
          </div>

          <div className="main-area">
            <div className="table-layout-wrapper">
              
              <div className="table-main-section">
                <DataTable 
                  columns={columnasTabla} 
                  rows={datosTabla} 
                  onRowClick={(fila) => setTitularTablaSelec(fila)}
                  emptyText="No hay titulares o no coinciden con la búsqueda"
                  filaActiva={titularTablaSelec}
                  idKey="id_usuario"
                  pageSize={10} 
                />
              </div>

              <div className="side-actions">
                <ActionButtons
                  filaSeleccionada={titularTablaSelec}
                  botones={[
                    { label: "Crear Salón", onClick: abrirModalCrearSalon, variante: "primary", siempreActivo: true },
                    { label: "Asignar Titular", onClick: abrirModalAsignar, variante: "primary", siempreActivo: true },
                    { label: "Editar Asignación", onClick: abrirModalEditarAsignacion, variante: "secondary", siempreActivo: false }
                  ]}
                />
              </div>  

            </div>
          </div>
        </div>

        <ParamModal 
          title={modalMode === "crearSalon" ? "CREAR NUEVO SALÓN" : modalMode === "crear" ? "ASIGNAR TITULAR" : "EDITAR TITULAR"}
          isOpen={modalOpen} 
          onClose={() => setModalOpen(false)} 
        >
          {modalMode === "crearSalon" && (
            <>
              <div className="asig-flex-row">
                <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
                  <label className="modal-label" style={{ paddingTop: 0 }}>Grado</label>
                  <select 
                    className="modal-input modal-select" 
                    value={formValues.grado || ""} 
                    onChange={(e) => handleModalChange("grado", e.target.value)}
                  >
                    <option value="" disabled>Seleccionar...</option>
                    {NOMBRES_GRADOS.map((gradoNombre) => (
                      <option key={gradoNombre} value={gradoNombre}>{gradoNombre}</option>
                    ))}
                  </select>
                </div>
                <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
                  <label className="modal-label" style={{ paddingTop: 0 }}>Grupo</label>
                  <input 
                    type="text" 
                    className="modal-input" 
                    placeholder="Ej: A" 
                    value={formValues.grupo || ""} 
                    onChange={(e) => handleModalChange("grupo", e.target.value.toUpperCase())}
                  />
                </div>
              </div>

              <div className="asig-flex-row" style={{ marginTop: "16px" }}>
                <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
                  <label className="modal-label" style={{ paddingTop: 0 }}>Titular Asignado</label>
                  <select className="modal-input modal-select" value={formValues.id_usuario || ""} onChange={(e) => handleModalChange("id_usuario", e.target.value)}>
                    <option value="" disabled>Seleccionar titular...</option>
                    {titulares.map(t => <option key={t.id_usuario} value={t.id_usuario}>{t.nombre}</option>)}
                  </select>
                </div>
              </div>

              <div className="modal-actions" style={{ marginTop: "30px" }}>
                <button className="modal-btn modal-btn--accept" onClick={handleCrearSalonSubmit}>Aceptar</button>
                <button className="modal-btn modal-btn--cancel" onClick={() => setModalOpen(false)}>Cancelar</button>
              </div>
            </>
          )}

          {modalMode !== "crearSalon" && (
            <>
              <div className="asig-flex-row">
                <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
                  <label className="modal-label" style={{ paddingTop: 0 }}>Titular</label>
                  <select 
                    className="modal-input modal-select" value={formValues.id_usuario || ""} 
                    onChange={(e) => handleModalChange("id_usuario", e.target.value)} disabled={modalMode === "editar"} 
                  >
                    <option value="" disabled>Seleccionar titular...</option>
                    {titulares.map(t => <option key={t.id_usuario} value={t.id_usuario}>{t.nombre}</option>)}
                  </select>
                </div>
              </div>

              <div className="asig-flex-row" style={{ marginTop: "16px", alignItems: "flex-end" }}>
                <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
                  <label className="modal-label" style={{ paddingTop: 0 }}>Grado</label>
                  <select className="modal-input modal-select" value={formValues.grado || ""} onChange={(e) => { handleModalChange("grado", e.target.value); handleModalChange("grupo", ""); }} disabled={!formValues.id_usuario}>
                    <option value="" disabled>Seleccionar...</option>
                    {gradosUnicosModal.map(g => <option key={g} value={g}>{g}</option>)}
                  </select>
                </div>
                <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
                  <label className="modal-label" style={{ paddingTop: 0 }}>Grupo</label>
                  <select className="modal-input modal-select" value={formValues.grupo || ""} onChange={(e) => handleModalChange("grupo", e.target.value)} disabled={!formValues.grado || !formValues.id_usuario}>
                    <option value="" disabled>Seleccionar...</option>
                    {gruposDisponiblesModal.map(s => <option key={s.id_salon} value={s.grupo}>{s.grupo}</option>)}
                  </select>
                </div>
                <div style={{ paddingBottom: "1px" }}>
                  <button className="asig-btn-add" onClick={handleAddSalonTemp} disabled={cargandoAccion || !formValues.grupo}>Agregar +</button>
                </div>
              </div>

              <div className="asig-asignaciones-section">
                <h4 className="asig-section-title">ASIGNACIONES ACTUALES</h4>
                <div className="asig-pills-container">
                  {!formValues.id_usuario ? (
                    <p className="asig-empty-text">Seleccione un titular arriba</p>
                  ) : salonesTemp.length === 0 ? (
                    <p className="asig-empty-text">El titular no tiene salones asignados</p>
                  ) : (
                    salonesTemp.map(salon => (
                      <div key={salon.id_salon} className="asig-pill-modern">
                        <span>{salon.grado} - {salon.grupo}</span>
                        <button className="asig-remove-btn" title="Remover Asignación" onClick={() => handleRemoveSalonTemp(salon)}>✕</button>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="modal-actions" style={{ marginTop: "30px" }}>
                <button className="modal-btn modal-btn--accept" onClick={handleGuardarAsignaciones} disabled={cargandoAccion}>
                  Aceptar
                </button>
                <button className="modal-btn modal-btn--cancel" onClick={() => setModalOpen(false)}>
                  Cancelar
                </button>
              </div>
            </>
          )}
        </ParamModal>

        <Alert {...alertConfig} onClose={alertConfig.onClose || closeAlert} />
      </ModuleLayout>
    </div>
  );
};

export default AsignacionTitularesPage;
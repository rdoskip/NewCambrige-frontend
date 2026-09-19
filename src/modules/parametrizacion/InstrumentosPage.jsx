import { useState, useEffect, useMemo } from "react";
import "./InstrumentosPage.css"; 

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
  obtenerInstrumentosRequest, 
  crearInstrumentoRequest, 
  actualizarInstrumentoRequest, 
  eliminarInstrumentoRequest,
  obtenerCategoriasRequest,
  crearCategoriaRequest
} from "../../api/endpointsParametrizacion"; 

import { Icon } from '@mdi/react';
import {
  mdiHome, mdiAccount, mdiCalendar, mdiTestTube,
  mdiGuitarElectric, mdiCube, mdiBook, mdiAccountGroup,
} from '@mdi/js';

const capitalizar = (texto) => texto ? texto.charAt(0).toUpperCase() + texto.slice(1).toLowerCase() : "—";

const InstrumentosPage = () => {
  const { user, roles, loadingRoles, logout } = useAuth();
  
  const [instrumentos, setInstrumentos] = useState([]);
  const [categoriasDb, setCategoriasDb] = useState([]); 
  const [instrumentoSeleccionado, setInstrumentoSeleccionado] = useState(null);
  
  const [filtros, setFiltros] = useState({ nombre: "", categoria: "", estado: "" });
  const [searchKey, setSearchKey] = useState(0); 
  
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState("crear");
  const [formValues, setFormValues] = useState({});

  const [modalCategoriaOpen, setModalCategoriaOpen] = useState(false);
  const [nombreCategoria, setNombreCategoria] = useState("");

  const [alertConfig, setAlertConfig] = useState({ isOpen: false, type: "info", message: "", onClose: null, onCancel: null });

  const closeAlert = () => setAlertConfig(prev => ({ ...prev, isOpen: false }));

  const showAlert = (type, message, title = "", customConfig = {}) => {
    setAlertConfig({
      isOpen: true, type, message, title, onClose: closeAlert, onCancel: null, ...customConfig
    });
  };

  const cargarDatos = async () => {
    try {
      const [resInstrumentos, resCategorias] = await Promise.all([
        obtenerInstrumentosRequest(),
        obtenerCategoriasRequest().catch(() => ({ data: [] }))
      ]);
      setInstrumentos(resInstrumentos.data || []);
      setCategoriasDb(resCategorias.data || []);
      setInstrumentoSeleccionado(null); 
    } catch (error) {
      showAlert("error", "Error al cargar la información de la base de datos.");
    }
  };

  useEffect(() => { cargarDatos(); }, []);

  const opcionesCategoria = useMemo(() => {
    return categoriasDb.map(c => ({
      value: c.id_categoria,
      label: capitalizar(c.nombre)
    }));
  }, [categoriasDb]);

  const categoriasNombresBusqueda = useMemo(() => [...new Set(categoriasDb.map(c => capitalizar(c.nombre)))], [categoriasDb]);

  // ==================== LÓGICA DE CATEGORÍAS ====================
  const abrirModalCategoria = () => {
    setNombreCategoria("");
    setModalCategoriaOpen(true);
  };

  const guardarCategoria = async () => {
    if (!nombreCategoria || !nombreCategoria.trim()) {
      return showAlert("warning", "El nombre de la categoría es obligatorio.");
    }
    try {
      await crearCategoriaRequest({ nombre: nombreCategoria.trim() });
      showAlert("success", "Categoría creada correctamente.");
      setModalCategoriaOpen(false);
      cargarDatos(); 
    } catch (error) {
      showAlert("error", error.response?.data?.detail || "Error al crear la categoría.");
    }
  };

  // ==================== LÓGICA DE INSTRUMENTOS ====================
  const abrirModalCrear = () => {
    setModalMode("crear");
    setFormValues({ nombre: "", id_categoria: "", cantidad_total: 1, estado: "Activo" });
    setModalOpen(true);
  };

  const abrirModalEditar = () => {
    if (!instrumentoSeleccionado) return;
    setModalMode("editar");
    setFormValues({
      nombre: instrumentoSeleccionado.nombre || "",
      id_categoria: instrumentoSeleccionado.id_categoria || "",
      cantidad_total: instrumentoSeleccionado.cantidad_total || 0,
      estado: capitalizar(instrumentoSeleccionado.estado) || "Activo"
    });
    setModalOpen(true);
  };

  const handleModalChange = (key, value) => {
    setFormValues(prev => ({ ...prev, [key]: value }));
  };

  const guardarInstrumento = async () => {
    if (!formValues.nombre || !formValues.nombre.trim()) return showAlert("warning", "El nombre del instrumento es obligatorio.");
    if (!formValues.id_categoria) return showAlert("warning", "Debe asignar una Categoría.");
    if (formValues.cantidad_total === "" || formValues.cantidad_total < 0) return showAlert("warning", "La cantidad total debe ser mayor o igual a 0.");
    if (!formValues.estado) return showAlert("warning", "Debe seleccionar un Estado.");

    const payload = {
      nombre: formValues.nombre.trim(),
      id_categoria: parseInt(formValues.id_categoria),
      cantidad_total: parseInt(formValues.cantidad_total),
      estado: formValues.estado
    };

    try {
      if (modalMode === "editar") {
        await actualizarInstrumentoRequest(instrumentoSeleccionado.id_instrumento, payload);
        showAlert("success", "Instrumento actualizado correctamente.");
      } else {
        await crearInstrumentoRequest(payload);
        showAlert("success", "Instrumento registrado correctamente.");
      }
      setModalOpen(false);
      cargarDatos();
    } catch (error) {
      showAlert("error", error.response?.data?.detail || "Error al guardar el instrumento.");
    }
  };

  const confirmarEliminacion = () => {
    if (!instrumentoSeleccionado) return;
    if (instrumentoSeleccionado.cantidad_disponible < instrumentoSeleccionado.cantidad_total) {
      return showAlert("warning", "TIENE ASIGNACIONES ACTIVAS. No es posible eliminarlo porque faltan instrumentos por devolver.");
    }
    showAlert("warning", `Esta acción eliminará permanentemente: ${instrumentoSeleccionado.nombre}`, "ELIMINAR INSTRUMENTO", {
      acceptText: "Eliminar",
      cancelText: "Cancelar",
      onCancel: closeAlert,
      onClose: async () => {
        closeAlert();
        try {
          await eliminarInstrumentoRequest(instrumentoSeleccionado.id_instrumento);
          showAlert("success", "El instrumento fue eliminado correctamente.");
          cargarDatos();
        } catch (error) {
          showAlert("error", error.response?.data?.detail || "No se puede eliminar un instrumento con historial.");
        }
      }
    });
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
    { key: "id_instrumento", label: "Código" },
    { key: "nombre", label: "Instrumento" },
    { key: "categoria_nombre", label: "Categoría", render: (val) => capitalizar(val) || "Sin Asignar" },
    { key: "cantidad_total", label: "Stock Total" },
    { key: "cantidad_disponible", label: "Disponibles", render: (val) => <span style={{ fontWeight: 'bold' }}>{val}</span> },
    { key: "estado", label: "Estado", render: (val) => (
        <span className={val?.toLowerCase() === "activo" ? "instrumentos-badge--ok" : "instrumentos-badge--warning"}>
          {capitalizar(val)}
        </span>
      ) 
    }
  ];

  const instrumentosFiltrados = useMemo(() => {
    return instrumentos.filter(i => {
      const matchNombre = filtros.nombre ? (i.nombre || "").toLowerCase().includes(filtros.nombre.toLowerCase()) : true;
      const matchCategoria = filtros.categoria ? (i.categoria_nombre || "").toLowerCase() === filtros.categoria.toLowerCase() : true;
      const matchEstado = filtros.estado ? (i.estado || "").toLowerCase() === filtros.estado.toLowerCase() : true;
      return matchNombre && matchCategoria && matchEstado;
    });
  }, [instrumentos, filtros]);

  const userName = user?.nombre || "Usuario";
  const rol = roles[0] || (loadingRoles ? "Cargando rol..." : "Sin rol");

  return (
    <div className="dashboard-container">
      <Header title="SISTEMA DE PAZ Y SALVO - NEW CAMBRIDGE SCHOOL" />
      <ModuleLayout
        sidebar={<Sidebar menuItems={menuItems} selectedMenu="Instrumentos" user={{ nombre: userName, rol }} logout={logout} />}
      >
        <div className="instrumentos-wrapper page-master-wrapper">
          
          <div className="module-toolbar-container">
            <SearchBar
              key={searchKey}
              fields={[
                { key: 'nombre', label: 'Instrumento:', type: 'text' },
                { key: 'categoria', label: 'Categoría:', type: 'select', options: categoriasNombresBusqueda },
                { key: 'estado', label: 'Estado:', type: 'select', options: ['Activo', 'Inactivo', 'En mantenimiento'] }
              ]}
              onSearch={(nuevosFiltros) => {
                setFiltros(nuevosFiltros);
                setSearchKey(prev => prev + 1);
              }}
              cleanFilter={{ nombre: "", categoria: "", estado: "" }}
            />
          </div>

          <div className="main-area">
            <div className="table-layout-wrapper">
              
              <div className="table-main-section">
                <DataTable 
                  columns={columnasTabla} 
                  rows={instrumentosFiltrados} 
                  onRowClick={(fila) => setInstrumentoSeleccionado(fila)}
                  emptyText="No se encontraron instrumentos con esos criterios"
                  pageSize={10}
                />
              </div>

              <div className="side-actions">
                <ActionButtons
                  filaSeleccionada={instrumentoSeleccionado}
                  botones={[
                    { label: "Crear Categoría", onClick: abrirModalCategoria, variante: "secondary", siempreActivo: true },
                    { label: "Agregar Instrumento", onClick: abrirModalCrear, variante: "primary", siempreActivo: true },
                    { label: "Editar", onClick: abrirModalEditar, variante: "secondary", siempreActivo: false },
                    { label: "Eliminar", onClick: confirmarEliminacion, variante: "danger", siempreActivo: false }
                  ]}
                />
              </div>  

            </div>
          </div>
        </div>  

        {/* MODAL 1: INSTRUMENTOS (CREAR/EDITAR) */}
        <ParamModal 
          title={modalMode === "crear" ? "AGREGAR INSTRUMENTO" : "EDITAR INSTRUMENTO"}
          isOpen={modalOpen} 
          onClose={() => setModalOpen(false)} 
        >
          {/* Fila 1: Nombre y Categoría */}
          <div className="instrumentos-flex-row">
            <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
              <label className="modal-label" style={{ paddingTop: 0 }}>Nombre del Instrumento</label>
              <input 
                type="text" className="modal-input" placeholder="Ej: Guitarra Acústica" 
                value={formValues.nombre || ""} onChange={(e) => handleModalChange("nombre", e.target.value)} 
              />
            </div>
            <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
              <label className="modal-label" style={{ paddingTop: 0 }}>Categoría</label>
              <select 
                className="modal-input modal-select" 
                value={formValues.id_categoria || ""} 
                onChange={(e) => handleModalChange("id_categoria", e.target.value)}
              >
                <option value="" disabled>Seleccionar...</option>
                {opcionesCategoria.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </div>
          </div>

          {/* Fila 2: Cantidad y Estado */}
          <div className="instrumentos-flex-row" style={{ marginTop: "16px" }}>
            <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
              <label className="modal-label" style={{ paddingTop: 0 }}>Cantidad Total</label>
              <input 
                type="number" className="modal-input" placeholder="0" min="0"
                value={formValues.cantidad_total !== undefined ? formValues.cantidad_total : ""} 
                onChange={(e) => handleModalChange("cantidad_total", e.target.value)} 
              />
            </div>
            <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
              <label className="modal-label" style={{ paddingTop: 0 }}>Estado</label>
              <select 
                className="modal-input modal-select" 
                value={formValues.estado || ""} 
                onChange={(e) => handleModalChange("estado", e.target.value)}
              >
                <option value="" disabled>Seleccionar...</option>
                <option value="Activo">Activo</option>
                <option value="Inactivo">Inactivo</option>
                <option value="En mantenimiento">En mantenimiento</option>
              </select>
            </div>
          </div>

          {modalMode === "editar" && instrumentoSeleccionado && (
            <div className="instrumentos-flex-row" style={{ marginTop: "16px" }}>
              <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
                
              </div>
            </div>
          )}

          <div className="modal-actions" style={{ marginTop: "30px" }}>
            <button className="modal-btn modal-btn--accept" onClick={guardarInstrumento}>Aceptar</button>
            <button className="modal-btn modal-btn--cancel" onClick={() => setModalOpen(false)}>Cancelar</button>
          </div>
        </ParamModal>

        {/* MODAL 2: CREAR CATEGORÍA */}
        <ParamModal 
          title="NUEVA CATEGORÍA"
          isOpen={modalCategoriaOpen} 
          onClose={() => setModalCategoriaOpen(false)} 
        >
          <div className="instrumentos-flex-row">
            <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
              <label className="modal-label" style={{ paddingTop: 0 }}>Nombre de la Categoría</label>
              <input 
                type="text" className="modal-input" placeholder="Ej: Viento, Percusión..." 
                value={nombreCategoria} onChange={(e) => setNombreCategoria(e.target.value)} 
              />
            </div>
          </div>
          <div className="modal-actions" style={{ marginTop: "30px" }}>
            <button className="modal-btn modal-btn--accept" onClick={guardarCategoria}>Aceptar</button>
            <button className="modal-btn modal-btn--cancel" onClick={() => setModalCategoriaOpen(false)}>Cancelar</button>
          </div>
        </ParamModal>

        <Alert {...alertConfig} onClose={alertConfig.onClose || closeAlert} />
      </ModuleLayout>
    </div>
  );
};

export default InstrumentosPage;
import { useState, useEffect, useMemo } from "react";
import "./LibrosPage.css";

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
  obtenerLibrosRequest, 
  crearLibroRequest, 
  actualizarLibroRequest, 
  eliminarLibroRequest,
  obtenerAniosRequest,
  obtenerSalonesPorPeriodoRequest
} from "../../api/endpointsParametrizacion"; 

import { Icon } from '@mdi/react';
import {
  mdiHome, mdiAccount, mdiCalendar, mdiTestTube,
  mdiGuitarElectric, mdiCube, mdiBook, mdiAccountGroup,
} from '@mdi/js';

const capitalizar = (texto) => texto ? texto.charAt(0).toUpperCase() + texto.slice(1).toLowerCase() : "—";

const LibrosPage = () => {
  const { user, roles, loadingRoles, logout } = useAuth();
  
  const [libros, setLibros] = useState([]);
  const [salonesDb, setSalonesDb] = useState([]); 
  const [libroSeleccionado, setLibroSeleccionado] = useState(null);
  
  const [filtros, setFiltros] = useState({ nombre: "", autor: "", edicion: "" });
  
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState("crear");
  const [formValues, setFormValues] = useState({});
  const [alertConfig, setAlertConfig] = useState({ isOpen: false, type: "info", message: "", onClose: null, onCancel: null });

  const closeAlert = () => setAlertConfig(prev => ({ ...prev, isOpen: false }));

  const showAlert = (type, message, title = "", customConfig = {}) => {
    setAlertConfig({
      isOpen: true, type, message, title, onClose: closeAlert, onCancel: null, ...customConfig
    });
  };

  const cargarDatos = async () => {
    try {
      const resAnios = await obtenerAniosRequest();
      const periodoAct = resAnios.data.find(a => a.activo === true);
      const idPer = periodoAct ? periodoAct.id_periodo : 1;

      const [resLibros, resSalones] = await Promise.all([
        obtenerLibrosRequest(),
        obtenerSalonesPorPeriodoRequest(idPer).catch(() => ({ data: [] }))
      ]);
      
      setLibros(resLibros.data || []);
      setSalonesDb(resSalones.data || []);
      setLibroSeleccionado(null); 
    } catch (error) {
      showAlert("error", "Error al cargar la información de la base de datos.");
    }
  };

  useEffect(() => { cargarDatos(); }, []);

  const opcionesEdicion = useMemo(() => [...new Set(libros.map(l => l.edicion).filter(Boolean))], [libros]);
  
  const opcionesSalon = useMemo(() => {
    return salonesDb.map(s => ({
      value: s.id_salon,
      label: `Grado ${s.grado} - Grupo ${s.grupo} ${s.titular_nombre ? `(${s.titular_nombre})` : ''}`
    }));
  }, [salonesDb]);

  const abrirModalCrear = () => {
    setModalMode("crear");
    setFormValues({ 
      nombre: "", 
      autor: "", 
      edicion: "", 
      id_salon: "", 
      estado_fisico: "",  
      disponible: true 
    });
    setModalOpen(true);
  };

  const abrirModalEditar = () => {
    if (!libroSeleccionado) return;
    setModalMode("editar");
    setFormValues({
      nombre: libroSeleccionado.nombre || "",
      autor: libroSeleccionado.autor || "",
      edicion: libroSeleccionado.edicion || "",
      id_salon: libroSeleccionado.id_salon || "",
      estado_fisico: capitalizar(libroSeleccionado.estado_fisico) || "",
      disponible: libroSeleccionado.disponible !== false
    });
    setModalOpen(true);
  };

  const handleModalChange = (key, value) => {
    setFormValues(prev => ({ ...prev, [key]: value }));
  };

  const guardarLibro = async () => {
    if (!formValues.nombre || !formValues.nombre.trim()) return showAlert("warning", "El título del libro es obligatorio.");
    if (!formValues.autor || !formValues.autor.trim()) return showAlert("warning", "El autor es obligatorio.");
    if (!formValues.edicion || !formValues.edicion.trim()) return showAlert("warning", "La edición es obligatoria.");
    if (!formValues.id_salon) return showAlert("warning", "Debe asignar un Salón al libro.");
    if (!formValues.estado_fisico) return showAlert("warning", "Debe seleccionar un Estado Físico.");

    const payload = {
      nombre: formValues.nombre.trim(),
      autor: formValues.autor.trim(),
      edicion: formValues.edicion.trim(),
      id_salon: parseInt(formValues.id_salon),
      estado_fisico: formValues.estado_fisico,
      disponible: formValues.disponible
    };

    try {
      if (modalMode === "editar") {
        await actualizarLibroRequest(libroSeleccionado.id_libro, payload);
      } else {
        await crearLibroRequest(payload);
      }
      showAlert("success", modalMode === "crear" ? "Libro registrado correctamente." : "Libro actualizado correctamente.");
      setModalOpen(false);
      cargarDatos();
    } catch (error) {
      showAlert("error", error.response?.data?.detail || "Error al guardar el libro.");
    }
  };

  const confirmarEliminacion = () => {
    if (!libroSeleccionado) return;
    
    if (libroSeleccionado.disponible === false) {
      return showAlert("warning", "EL LIBRO TIENE UN PRÉSTAMO ACTIVO. No es posible eliminarlo.");
    }

    showAlert("warning", `Esta acción eliminará permanentemente el libro: ${libroSeleccionado.nombre}`, "ELIMINAR LIBRO", {
      acceptText: "Eliminar",
      cancelText: "Cancelar",
      onCancel: closeAlert,
      onClose: async () => {
        closeAlert();
        try {
          await eliminarLibroRequest(libroSeleccionado.id_libro);
          showAlert("success", "El libro fue eliminado correctamente.");
          cargarDatos();
        } catch (error) {
          showAlert("error", error.response?.data?.detail || "No se puede eliminar un libro con historial activo.");
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
    { key: "id_libro", label: "Código",
      render: (val) => <span style={{ fontFamily: 'Roboto, sans-serif', fontWeight: 400 }}>{val}</span>
     },
    { key: "nombre", label: "Título del Libro" },
    { key: "autor", label: "Autor" },
    { key: "edicion", label: "Edición", render: (val) => val || "N/A" },
    { key: "salonObj", label: "Salón", render: (_, row) => {
        const salon = salonesDb.find(s => s.id_salon === row.id_salon);
        return salon ? `Grado ${salon.grado} - G${salon.grupo}` : "Sin asignar";
    }},
    { key: "estado_fisico", label: "Estado Físico", render: (val) => capitalizar(val) || "N/A" },
    { key: "disponible", label: "Disponibilidad", render: (val) => <span className={val ? "badge--ok" : "badge--no"}>{val ? "Disponible" : "Prestado"}</span> }
  ];

  const librosFiltrados = useMemo(() => {
    return libros.filter(l => {
      const matchNombre = filtros.nombre ? (l.nombre || "").toLowerCase().includes(filtros.nombre.toLowerCase()) : true;
      const matchAutor = filtros.autor ? (l.autor || "").toLowerCase().includes(filtros.autor.toLowerCase()) : true;
      const matchEdicion = filtros.edicion ? l.edicion === filtros.edicion : true;
      
      const isNotDeleted = !(l.nombre || "").includes("(Eliminado del Inventario)");
      return matchNombre && matchAutor && matchEdicion && isNotDeleted;
    });
  }, [libros, filtros]);

  const userName = user?.nombre || "Usuario";
  const rol = roles[0] || (loadingRoles ? "Cargando rol..." : "Sin rol");

  return (
    <div className="dashboard-container">
      <Header title="SISTEMA DE PAZ Y SALVO - NEW CAMBRIDGE SCHOOL" />
      <ModuleLayout
        sidebar={<Sidebar menuItems={menuItems} selectedMenu="Libros" user={{ nombre: userName, rol }} logout={logout} />}
      >
        <div className="libros-wrapper page-master-wrapper">
          
          <div className="module-toolbar-container">
            <SearchBar
              fields={[
                { key: 'nombre', label: 'Título:', type: 'text' },
                { key: 'autor', label: 'Autor:', type: 'text' },
                { key: 'edicion', label: 'Edición:', type: 'text' }
              ]}
              onSearch={(nuevosFiltros) => setFiltros(nuevosFiltros)}
              cleanFilter={{ nombre: "", autor: "", edicion: "" }}
            />
          </div>

          <div className="main-area">
            <div className="table-layout-wrapper">
              
              <div className="table-main-section">
                <DataTable 
                  columns={columnasTabla} 
                  rows={librosFiltrados} 
                  onRowClick={(fila) => setLibroSeleccionado(fila)}
                  emptyText="No se encontraron libros con esos criterios"
                  pageSize={10}
                />
              </div>

              <div className="side-actions">
                <ActionButtons
                  filaSeleccionada={libroSeleccionado}
                  botones={[
                    { label: "Agregar Libro", onClick: abrirModalCrear, variante: "primary", siempreActivo: true },
                    { label: "Editar Libro", onClick: abrirModalEditar, variante: "secondary", siempreActivo: false },
                    { label: "Eliminar Libro", onClick: confirmarEliminacion, variante: "danger", siempreActivo: false }
                  ]}
                />
              </div>  

            </div>
          </div>
        </div>  

        <ParamModal 
          title={modalMode === "crear" ? "AGREGAR LIBRO" : "EDITAR LIBRO"}
          isOpen={modalOpen} 
          onClose={() => setModalOpen(false)} 
        >
          {/* Fila 1: Título y Autor */}
          <div className="libros-flex-row">
            <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
              <label className="modal-label" style={{ paddingTop: 0 }}>Título del Libro</label>
              <input 
                type="text" className="modal-input" placeholder="Ej: Cien Años de Soledad" 
                value={formValues.nombre || ""} onChange={(e) => handleModalChange("nombre", e.target.value)} 
              />
            </div>
            <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
              <label className="modal-label" style={{ paddingTop: 0 }}>Autor</label>
              <input 
                type="text" className="modal-input" placeholder="Ej: Gabriel García M." 
                value={formValues.autor || ""} onChange={(e) => handleModalChange("autor", e.target.value)} 
              />
            </div>
          </div>

          {/* Fila 2: Edición y Salón */}
          <div className="libros-flex-row" style={{ marginTop: "16px" }}>
            <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
              <label className="modal-label" style={{ paddingTop: 0 }}>Edición</label>
              <input 
                type="text" className="modal-input" placeholder="Ej: 1ra Edición" 
                value={formValues.edicion || ""} onChange={(e) => handleModalChange("edicion", e.target.value)} 
              />
            </div>
            <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
              <label className="modal-label" style={{ paddingTop: 0 }}>Salón Asignado</label>
              <select 
                className="modal-input modal-select" 
                value={formValues.id_salon || ""} 
                onChange={(e) => handleModalChange("id_salon", e.target.value)}
              >
                <option value="" disabled>Seleccionar...</option>
                {opcionesSalon.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </div>
          </div>

          {/* Fila 3: Estado Físico y Disponibilidad */}
          <div className="libros-flex-row" style={{ marginTop: "16px", alignItems: "flex-end" }}>
            <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
              <label className="modal-label" style={{ paddingTop: 0 }}>Estado Físico</label>
              <select 
                className="modal-input modal-select" 
                value={formValues.estado_fisico || ""} 
                onChange={(e) => handleModalChange("estado_fisico", e.target.value)}
              >
                <option value="" disabled>Seleccionar...</option>
                <option value="Bueno">Bueno</option>
                <option value="Regular">Regular</option>
                <option value="Malo">Malo</option>
              </select>
            </div>
            <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
              <label className="modal-label" style={{ paddingTop: 0 }}>Disponibilidad</label>
              <div style={{ display: "flex", alignItems: "center", gap: "10px", marginTop: "6px", paddingBottom: "2px" }}>
                <label className="modal-label" style={{ padding: 0, margin: 0, minWidth: "85px" }}>
                  {formValues.disponible !== false ? "Disponible" : "Prestado"}
                </label>
                <label className="libros-toggle-switch" style={{ margin: 0 }}>
                  <input
                    type="checkbox"
                    checked={formValues.disponible !== false}
                    onChange={(e) => handleModalChange("disponible", e.target.checked)}
                  />
                  <span className="libros-slider"></span>
                </label>
              </div>
            </div>
          </div>

          {/* Botones de Acción */}
          <div className="modal-actions" style={{ marginTop: "30px" }}>
            <button className="modal-btn modal-btn--accept" onClick={guardarLibro}>Aceptar</button>
            <button className="modal-btn modal-btn--cancel" onClick={() => setModalOpen(false)}>Cancelar</button>
          </div>
        </ParamModal>

        <Alert {...alertConfig} onClose={alertConfig.onClose || closeAlert} />
      </ModuleLayout>
    </div>
  );
};

export default LibrosPage;
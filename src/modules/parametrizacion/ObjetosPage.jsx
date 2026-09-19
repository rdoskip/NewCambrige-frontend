import { useState, useEffect, useMemo } from "react";
import "./ObjetosPage.css";

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
  obtenerObjetosRequest, 
  crearObjetoRequest, 
  actualizarObjetoRequest, 
  eliminarObjetoRequest 
} from "../../api/endpointsParametrizacion"; 

import { Icon } from '@mdi/react';
import {
  mdiHome, mdiAccount, mdiCalendar, mdiTestTube,
  mdiGuitarElectric, mdiCube, mdiBook, mdiAccountGroup,
} from '@mdi/js';

const capitalizar = (texto) => texto ? texto.charAt(0).toUpperCase() + texto.slice(1).toLowerCase() : "—";

const ObjetosPage = () => {
  const { user, roles, loadingRoles, logout } = useAuth();
  
  const [objetos, setObjetos] = useState([]);
  const [objetoSeleccionado, setObjetoSeleccionado] = useState(null);
  const [filtros, setFiltros] = useState({ codigo: "", nombre: "", tipo: "" });
  const [searchKey, setSearchKey] = useState(0);
  
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState("crear");
  const [formValues, setFormValues] = useState({});
  const [alertConfig, setAlertConfig] = useState({ isOpen: false, type: "info", message: "", onClose: null, onCancel: null });

  const closeAlert = () => setAlertConfig(prev => ({ ...prev, isOpen: false }));

  const showAlert = (type, message, title = "", customConfig = {}) => {
    setAlertConfig({
      isOpen: true,
      type,
      message,
      title,
      onClose: closeAlert,
      onCancel: null,
      ...customConfig
    });
  };

  const cargarObjetos = async () => {
    try {
      const response = await obtenerObjetosRequest();
      const ordenado = [...(response.data || [])].sort((a, b) => a.nombre.localeCompare(b.nombre));
      setObjetos(ordenado);
      setObjetoSeleccionado(null); 
    } catch (error) {
      showAlert("error", "Error al cargar el inventario.");
    }
  };

  useEffect(() => { cargarObjetos(); }, []);

  const abrirModalCrear = () => {
    setModalMode("crear");
    setFormValues({ 
      nombre: "", 
      tipo: "",           
      talla: "",         
      cantidad_total: 1, 
      estado_fisico: "",  
      observacion: "" 
    });
    setModalOpen(true);
  };

  const abrirModalEditar = () => {
    if (!objetoSeleccionado) return;
    setModalMode("editar");
    setFormValues({
      nombre: objetoSeleccionado.nombre || "",
      tipo: capitalizar(objetoSeleccionado.tipo) || "",
      talla: objetoSeleccionado.talla || "",
      cantidad_total: objetoSeleccionado.cantidad_total || 0,
      estado_fisico: capitalizar(objetoSeleccionado.estado_fisico) || "",
      observacion: objetoSeleccionado.observacion || ""
    });
    setModalOpen(true);
  };

  const handleModalChange = (key, value) => {
    setFormValues(prev => {
      const updated = { ...prev, [key]: value };
      if (key === "tipo") {
        updated.talla = value === "Objeto" ? "No aplica" : "";
      }
      return updated;
    });
  };

  const guardarObjeto = async () => {
    if (!formValues.nombre || !formValues.nombre.trim()) {
      return showAlert("warning", "El nombre de la prenda u objeto es obligatorio.");
    }
    if (!formValues.tipo) {
      return showAlert("warning", "Debe seleccionar un Tipo.");
    }
    if (formValues.tipo === "Vestimenta" && !formValues.talla) {
      return showAlert("warning", "Debe seleccionar una Talla para la vestimenta.");
    }
    if (formValues.cantidad_total === "" || formValues.cantidad_total < 0) {
      return showAlert("warning", "La cantidad total ingresada es inválida.");
    }
    if (!formValues.estado_fisico) {
      return showAlert("warning", "Debe seleccionar un Estado Físico.");
    }

    const estadoL = (formValues.estado_fisico || "").toLowerCase();
    if (["regular", "malo"].includes(estadoL) && !(formValues.observacion || "").trim()) {
      return showAlert("warning", "Debe ingresar una observación obligatoria para ítems en estado Regular o Malo.");
    }

    const payload = {
      nombre: formValues.nombre,
      tipo: formValues.tipo,
      talla: formValues.talla,
      estado_fisico: formValues.estado_fisico,
      observacion: formValues.observacion,
      cantidad_total: parseInt(formValues.cantidad_total),
      cantidad_disponible: parseInt(formValues.cantidad_total) 
    };

    try {
      if (modalMode === "editar") {
        delete payload.cantidad_disponible; 
        await actualizarObjetoRequest(objetoSeleccionado.id_objeto, payload);
      } else {
        payload.fecha_registro = new Date().toLocaleDateString("en-CA");
        await crearObjetoRequest(payload);
      }
      showAlert("success", modalMode === "crear" ? "Prenda/Objeto registrado correctamente." : "Prenda/Objeto actualizado correctamente.");
      setModalOpen(false);
      cargarObjetos();
    } catch (error) {
      showAlert("error", error.response?.data?.detail || "Error al guardar el ítem.");
    }
  };

  const confirmarEliminacion = () => {
    if (!objetoSeleccionado) return;
    if (Number(objetoSeleccionado.prestadas) > 0) {
      return showAlert("warning", "LA PRENDA TIENE UN PRÉSTAMO ACTIVO. No es posible eliminarla.");
    }

    showAlert("warning", `Esta acción eliminará permanentemente la prenda: ${objetoSeleccionado.nombre}`, "ELIMINAR PRENDA", {
      acceptText: "Eliminar",
      cancelText: "Cancelar",
      onCancel: closeAlert,
      onClose: async () => {
        closeAlert();
        try {
          await eliminarObjetoRequest(objetoSeleccionado.id_objeto);
          showAlert("success", "La prenda fue eliminada correctamente.");
          cargarObjetos();
        } catch (error) {
          showAlert("error", error.response?.data?.detail || "Error eliminando la prenda.");
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
    { key: "id_objeto", label: "Código",
      render: (val) => <span style={{ fontFamily: 'Roboto, sans-serif', fontWeight: 400 }}>{val}</span>
     },
    { key: "nombre", label: "Nombre", render: (val) => capitalizar(val) },
    { key: "tipo", label: "Categoría", render: (val) => capitalizar(val) },
    { key: "talla", label: "Talla" },
    { key: "estado_fisico", label: "Estado", render: (val) => {
        const est = val?.toLowerCase() || "";
        let clase = "badge--ok";
        if (est === "regular") clase = "badge--warn";
        if (est === "malo") clase = "badge--no";
        return <span className={clase}>{capitalizar(val)}</span>;
    }},
    { key: "cantidad_total", label: "Total",
      render: (val) => <span style={{ fontFamily: 'Roboto, sans-serif', fontWeight: 400 }}>{val}</span>
    },
    { 
      key: "cantidad_disponible", 
      label: "Disponibles", 
      render: (val) => (
        <span 
          className={Number(val) > 0 ? "badge--ok" : "badge--no"}
          style={{ fontFamily: 'Roboto, sans-serif', fontWeight: 400 }}
        >
          {val}
        </span>
      )
    }
  ];

  const objetosFiltrados = useMemo(() => {
    return objetos.filter(o => {
      const matchCodigo = filtros.codigo ? String(o.id_objeto).includes(filtros.codigo) : true;
      const matchNombre = filtros.nombre ? (o.nombre || "").toLowerCase().includes(filtros.nombre.toLowerCase()) : true;
      const matchTipo = filtros.tipo ? (o.tipo || "").toLowerCase() === filtros.tipo.toLowerCase() : true;
      return matchCodigo && matchNombre && matchTipo;
    });
  }, [objetos, filtros]);

  const userName = user?.nombre || "Usuario";
  const rol = roles[0] || (loadingRoles ? "Cargando rol..." : "Sin rol");

  return (
    <div className="dashboard-container">
      <Header title="SISTEMA DE PAZ Y SALVO - NEW CAMBRIDGE SCHOOL" />
      <ModuleLayout
        sidebar={<Sidebar menuItems={menuItems} selectedMenu="Objetos" user={{ nombre: userName, rol }} logout={logout} />}
      >
        <div className="objetos-wrapper page-master-wrapper">
          
          <div className="module-toolbar-container">
            <SearchBar
              key={searchKey} 
              fields={[
                { key: 'codigo', label: 'Código:', type: 'text' },
                { key: 'nombre', label: 'Nombre:', type: 'text' },
                { key: 'tipo', label: 'Tipo:', type: 'select', options: ['Vestimenta', 'Objeto'] }
              ]}
              onSearch={(nuevosFiltros) => {
                setFiltros(nuevosFiltros);
                setSearchKey(prev => prev + 1); 
              }}
              cleanFilter={{ codigo: "", nombre: "", tipo: "" }} 
            />
          </div>

          <div className="main-area">
            <div className="table-layout-wrapper">
              
              <div className="table-main-section">
                <DataTable 
                  columns={columnasTabla} 
                  rows={objetosFiltrados} 
                  onRowClick={(fila) => setObjetoSeleccionado(fila)}
                  emptyText="No se encontraron ítems con esos criterios de búsqueda"
                  pageSize={10}
                />
              </div>

              <div className="side-actions">
                <ActionButtons
                  filaSeleccionada={objetoSeleccionado}
                  botones={[
                    { label: "Agregar Objeto", onClick: abrirModalCrear, variante: "primary", siempreActivo: true },
                    { label: "Editar Objeto", onClick: abrirModalEditar, variante: "secondary", siempreActivo: false },
                    { label: "Eliminar Objeto", onClick: confirmarEliminacion, variante: "danger", siempreActivo: false }
                  ]}
                />
              </div>  

            </div>
          </div>
        </div>

        <ParamModal 
          title={modalMode === "crear" ? "AGREGAR OBJETO" : "EDITAR OBJETO"}
          isOpen={modalOpen} 
          onClose={() => setModalOpen(false)}
        >
          {/* Fila 1: Objeto y Categoría */}
          <div className="obj-flex-row">
            <div style={{ flex: 2, display: "flex", flexDirection: "column" }}>
              <label className="modal-label" style={{ paddingTop: 0 }}>Objeto</label>
              <input 
                type="text" className="modal-input" placeholder="Ej: Camisa Diario" 
                value={formValues.nombre || ""} onChange={(e) => handleModalChange("nombre", e.target.value)} 
              />
            </div>
            <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
              <label className="modal-label" style={{ paddingTop: 0 }}>Categoría</label>
              <select 
                className="modal-input modal-select" 
                value={formValues.tipo || ""} 
                onChange={(e) => handleModalChange("tipo", e.target.value)}
              >
                <option value="" disabled>Seleccionar...</option>
                <option value="Vestimenta">Vestimenta</option>
                <option value="Objeto">Objeto</option>
              </select>
            </div>
          </div>

          {/* Fila 2: Talla, Cantidad Total y Estado Físico */}
          <div className="obj-flex-row" style={{ marginTop: "16px" }}>
            <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
              <label className="modal-label" style={{ paddingTop: 0 }}>Talla</label>
              <select 
                className="modal-input modal-select" 
                value={formValues.talla || ""} 
                onChange={(e) => handleModalChange("talla", e.target.value)}
                disabled={!formValues.tipo || formValues.tipo === "Objeto"}
              >
                <option value="" disabled>Seleccionar...</option>
                {formValues.tipo === "Objeto" ? (
                  <option value="No aplica">No aplica</option>
                ) : (
                  <>
                    <option value="XS">XS</option>
                    <option value="S">S</option>
                    <option value="M">M</option>
                    <option value="L">L</option>
                    <option value="XL">XL</option>
                  </>
                )}
              </select>
            </div>
            <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
              <label className="modal-label" style={{ paddingTop: 0 }}>Cantidad Total</label>
              <input 
                type="number" min="0" className="modal-input" 
                value={formValues.cantidad_total ?? 1} 
                onChange={(e) => handleModalChange("cantidad_total", e.target.value)} 
              />
            </div>
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
          </div>

          {/* Fila 3: Observación */}
          <div className="obj-flex-row" style={{ marginTop: "16px" }}>
            <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
              <label className="modal-label" style={{ paddingTop: 0 }}>
                Observación {["Regular", "Malo"].includes(formValues.estado_fisico) ? <span style={{color: "var(--color-danger)"}}>* (Obligatorio)</span> : "(Opcional)"}
              </label>
              <input 
                type="text" className="modal-input" placeholder="Detalles extra o motivo del estado..." 
                value={formValues.observacion || ""} onChange={(e) => handleModalChange("observacion", e.target.value)} 
              />
            </div>
          </div>

          {/* Botones de Acción */}
          <div className="modal-actions" style={{ marginTop: "30px" }}>
            <button className="modal-btn modal-btn--accept" onClick={guardarObjeto}>Aceptar</button>
            <button className="modal-btn modal-btn--cancel" onClick={() => setModalOpen(false)}>Cancelar</button>
          </div>
        </ParamModal>

        <Alert {...alertConfig} onClose={alertConfig.onClose || closeAlert} />
      </ModuleLayout>
    </div>
  );
};

export default ObjetosPage;
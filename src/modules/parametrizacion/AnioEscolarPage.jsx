import { useState, useEffect, useRef, useMemo } from "react";
import { ChevronUp, ChevronDown, Calendar as CalendarIcon } from "lucide-react";
import "./AnioEscolarPage.css";

import Header from "../../components/layout/header";
import Sidebar from "../../components/layout/Sidebar";
import ModuleLayout from "../../components/layout/ModuleLayout";
import DataTable from "../../components/shared/DataTable";
import ActionButtons from "../../components/shared/ActionButtons";
import ParamModal from "../../components/shared/ParamModal";
import Alert from "../../components/shared/Alert";

import { useAuth } from "../../api/AuthContext";
import { obtenerAniosRequest, crearAnioRequest, actualizarAnioRequest } from "../../api/endpointsParametrizacion";

import { Icon } from '@mdi/react';
import {
  mdiHome, mdiAccount, mdiCalendar, mdiTestTube,
  mdiGuitarElectric, mdiCube, mdiBook, mdiAccountGroup,
} from '@mdi/js';

const formatAnioDoble = (anioStr) => {
  if (!anioStr) return "";
  const anioNum = parseInt(anioStr);
  if (isNaN(anioNum)) return anioStr;
  return `${anioNum} - ${anioNum + 1}`;
};

const YearPicker = ({ selectedYear, onYearSelect, placeholder = "Seleccionar año" }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [baseYear, setBaseYear] = useState(selectedYear || new Date().getFullYear());
  const popoverRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (popoverRef.current && !popoverRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const aniosVisibles = Array.from({ length: 16 }, (_, i) => baseYear + i);

  return (
    <div className="anio-form-group" ref={popoverRef} style={{ width: '100%', margin: 0, position: 'relative' }}>
      <div className="anio-custom-year-picker" onClick={() => setIsOpen(!isOpen)}>
        <span>{selectedYear ? formatAnioDoble(selectedYear) : placeholder}</span>
        <CalendarIcon size={18} color="var(--color-secondary)" />
      </div>

      {isOpen && (
        <div className="anio-year-grid-popover">
          <div className="anio-year-grid-header">
            <span>{aniosVisibles[0]} - {aniosVisibles[15]}</span>
            <div style={{ display: 'flex', gap: '5px' }}>
              <button type="button" onClick={(e) => { e.stopPropagation(); setBaseYear(b => b - 16); }}><ChevronUp size={16} /></button>
              <button type="button" onClick={(e) => { e.stopPropagation(); setBaseYear(b => b + 16); }}><ChevronDown size={16} /></button>
            </div>
          </div>
          <div className="anio-year-grid">
            {aniosVisibles.map(anio => (
              <button 
                key={anio} 
                type="button"
                className={`anio-year-btn ${anio === selectedYear ? 'active' : ''}`}
                onClick={(e) => { 
                  e.stopPropagation(); 
                  if (anio === selectedYear) {
                    onYearSelect(null);
                  } else {
                    onYearSelect(anio);
                  }
                  setIsOpen(false); 
                }}
              >
                {anio}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

const AnioEscolarPage = () => {
  const { user, roles, loadingRoles, logout } = useAuth();
  const [anios, setAnios] = useState([]);
  const [anioSeleccionado, setAnioSeleccionado] = useState(null);
  
  const [filtroAnioSeleccionado, setFiltroAnioSeleccionado] = useState(null);
  const [filtroAnioAplicado, setFiltroAnioAplicado] = useState(null);
  
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState("crear"); 
  const [formValues, setFormValues] = useState({});
  const [alertConfig, setAlertConfig] = useState({ isOpen: false, type: "info", message: "", onClose: null, onCancel: null });

  const closeAlert = () => setAlertConfig(prev => ({ ...prev, isOpen: false }));

  const showAlert = (type, message, title = "") => setAlertConfig({ 
    isOpen: true, type, message, title, onClose: closeAlert, onCancel: null
  });

  const cargarAnios = async () => {
    try {
      const response = await obtenerAniosRequest();
      setAnios(response.data || []);
      setAnioSeleccionado(null); 
    } catch (error) {
      showAlert("error", "Error al cargar los años escolares.");
    }
  };

  useEffect(() => { cargarAnios(); }, []);

  const aniosFiltrados = useMemo(() => {
    return filtroAnioAplicado 
      ? anios.filter(a => parseInt(a.nombre.substring(0, 4)) === filtroAnioAplicado)
      : anios;
  }, [anios, filtroAnioAplicado]);

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
    { key: "nombre", label: "AÑO ESCOLAR",
        render: (val) => <span style={{ fontFamily: 'Roboto, sans-serif', fontWeight: 400 }}>{formatAnioDoble(val)}</span>
     },
    {
      key: "fecha_inicio",
      label: "FECHA INICIO",
      render: (val) => {
        const fecha = new Date(val).toLocaleDateString('es-CO', { timeZone: 'UTC' });
        return <span style={{ fontFamily: 'Roboto, sans-serif', fontWeight: 400 }}>{fecha}</span>;
      }
    },
    {
      key: "fecha_fin",
      label: "FECHA FIN",
      render: (val) => {
        const fecha = new Date(val).toLocaleDateString('es-CO', { timeZone: 'UTC' });
        return <span style={{ fontFamily: 'Roboto, sans-serif', fontWeight: 400 }}>{fecha}</span>;
      }
    },
    { key: "activo", label: "ESTADO", render: (val) => <span className={val ? 'badge--ok' : 'badge--no'}>{val ? 'Activo' : 'Inactivo'}</span> }
  ];

  const abrirModalCrear = () => { 
    setModalMode("crear"); 
    setFormValues({ anioInicio: new Date().getFullYear(), fechaInicio: "", fechaFin: "", activo: true });
    setModalOpen(true); 
  };

  const abrirModalEditar = () => { 
    if(!anioSeleccionado) return;
    setModalMode("editar"); 
    setFormValues({
      anioInicio: parseInt(anioSeleccionado.nombre.substring(0, 4)),
      fechaInicio: anioSeleccionado.fecha_inicio.split('T')[0],
      fechaFin: anioSeleccionado.fecha_fin.split('T')[0],
      activo: anioSeleccionado.activo
    });
    setModalOpen(true); 
  };

  const handleModalChange = (key, value) => {
    setFormValues(prev => ({ ...prev, [key]: value }));
  };

  const guardarAnio = async () => {
    if (!formValues.fechaInicio || !formValues.fechaFin) {
      return showAlert("warning", "Por favor selecciona ambas fechas.");
    }

    const startYear = parseInt(formValues.fechaInicio.split("-")[0]);
    const endYear = parseInt(formValues.fechaFin.split("-")[0]);
    const allowedStartYear = formValues.anioInicio;
    const allowedEndYear = formValues.anioInicio + 1;

    if (new Date(formValues.fechaInicio) >= new Date(formValues.fechaFin)) {
      return showAlert("warning", "La fecha de fin debe ser posterior a la de inicio.");
    }

    if (startYear < allowedStartYear || startYear > allowedEndYear) {
      return showAlert("warning", `La fecha de inicio debe estar dentro del periodo ${allowedStartYear} - ${allowedEndYear}.`);
    }
    if (endYear < allowedStartYear || endYear > allowedEndYear) {
      return showAlert("warning", `La fecha de fin debe estar dentro del periodo ${allowedStartYear} - ${allowedEndYear}.`);
    }

    const payload = {
      fecha_inicio: `${formValues.fechaInicio}T00:00:00`,
      fecha_fin: `${formValues.fechaFin}T23:59:59`,
      activo: formValues.activo
    };

    if (modalMode === "crear") {
      payload.anio_inicio = parseInt(formValues.anioInicio);
    }

    const ejecutarPeticion = async (forzarActivo) => {
      if (modalMode === "editar") {
        await actualizarAnioRequest(anioSeleccionado.id_periodo, payload, forzarActivo);
      } else {
        await crearAnioRequest(payload, forzarActivo);
      }
    };

    try {
      await ejecutarPeticion(false);
      showAlert("success", modalMode === "crear" ? "Año escolar creado correctamente." : "Año escolar actualizado.");
      setModalOpen(false);
      cargarAnios();
    } catch (error) {
      if (error.response?.status === 409) {
        setAlertConfig({
          isOpen: true,
          type: "warning",
          title: "ADVERTENCIA",
          message: `${error.response.data.detail}\n\n¿Deseas forzar el cambio y desactivar el año anterior?`,
          onClose: async () => {
            closeAlert();
            try {
              await ejecutarPeticion(true);
              showAlert("success", "Año escolar actualizado y forzado como activo.");
              setModalOpen(false);
              cargarAnios();
            } catch (err) {
              showAlert("error", "Error al forzar el año escolar.");
            }
          },
          onCancel: closeAlert,
          acceptText: "Aceptar",
          cancelText: "Cancelar"
        });
      } else {
        showAlert("error", error.response?.data?.detail || "Error al guardar el periodo académico.");
      }
    }
  };

  const userName = user?.nombre || "Usuario";
  const rol = roles[0] || (loadingRoles ? "Cargando rol..." : "Sin rol");

  return (
    <div className="dashboard-container">
      <Header title="SISTEMA DE PAZ Y SALVO - NEW CAMBRIDGE SCHOOL" />
      <ModuleLayout
        sidebar={<Sidebar menuItems={menuItems} selectedMenu="Año Escolar" user={{ nombre: userName, rol }} loadingRoles={loadingRoles} logout={logout} />}
      >
        <div className="anio-wrapper page-master-wrapper">
          
          <div className="module-toolbar-container">
            <div className="searchbar-wrapper" style={{ padding: 0, width: 'auto' }}>
              <div className="searchbar-field">
                <label className="searchbar-label">Año Escolar:</label>
                <div style={{ width: '220px' }}>
                  <YearPicker 
                    selectedYear={filtroAnioSeleccionado} 
                    onYearSelect={setFiltroAnioSeleccionado} 
                    placeholder="Seleccionar"
                  />
                </div>
              </div>
                <button 
                  className="searchbar-btn" 
                  onClick={() => {
                    setFiltroAnioAplicado(filtroAnioSeleccionado); 
                    setFiltroAnioSeleccionado(null);               
                  }}
                >
                  Buscar
                </button>
            </div>
          </div>

          <div className="main-area">
            <div className="table-layout-wrapper">
              
              <div className="table-main-section">
                <DataTable 
                  columns={columnasTabla} 
                  rows={aniosFiltrados} 
                  onRowClick={(fila) => setAnioSeleccionado(fila)}
                  emptyText={filtroAnioAplicado ? `No se encontraron registros para el año ${formatAnioDoble(filtroAnioAplicado)}` : "No hay años registrados"}
                  pageSize={10}
                />
              </div>

              <div className="side-actions">
                <ActionButtons
                  filaSeleccionada={anioSeleccionado}
                  botones={[
                    { label: "Crear Año Escolar", onClick: abrirModalCrear, variante: "primary", siempreActivo: true },
                    { label: "Editar Año Escolar", onClick: abrirModalEditar, variante: "secondary", siempreActivo: false }
                  ]}
                />
              </div>

            </div>
          </div>
        </div>


        <ParamModal 
          title={modalMode === "crear" ? "CREAR AÑO ESCOLAR" : "EDITAR AÑO ESCOLAR"}
          isOpen={modalOpen} 
          onClose={() => setModalOpen(false)} 
        >
          {/* Fila 1: Año y Estado */}
          <div style={{ display: "flex", gap: "16px", width: "100%", alignItems: "flex-end" }}>
            <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
              <label className="modal-label" style={{ paddingTop: 0 }}>Año Escolar</label>
              {modalMode === "editar" ? (
                <div className="anio-input-disabled">
                  {formatAnioDoble(formValues.anioInicio)}
                </div>
              ) : (
                <YearPicker 
                  selectedYear={formValues.anioInicio} 
                  onYearSelect={(val) => handleModalChange("anioInicio", val)} 
                />
              )}
            </div>
            <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
              <label className="modal-label" style={{ paddingTop: 0 }}>Estado</label>
              <div style={{ display: "flex", alignItems: "center", gap: "10px", marginTop: "6px", paddingBottom: "2px" }}>
                <label className="modal-label" style={{ padding: 0, margin: 0, minWidth: "65px" }}>
                  {formValues.activo ? "Activo" : "Inactivo"}
                </label>
                <label className="anio-toggle-switch" style={{ margin: 0 }}>
                  <input
                    type="checkbox"
                    checked={formValues.activo ?? true}
                    onChange={(e) => handleModalChange("activo", e.target.checked)}
                  />
                  <span className="anio-slider"></span>
                </label>
              </div>
            </div>
          </div>

          {/* Fila 2: Fechas */}
          <div style={{ display: "flex", gap: "16px", width: "100%", marginTop: "16px" }}>
            <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
              <label className="modal-label" style={{ paddingTop: 0 }}>Fecha de Inicio</label>
              <input 
                type="date" 
                className="modal-input" 
                value={formValues.fechaInicio || ""} 
                onChange={(e) => handleModalChange("fechaInicio", e.target.value)} 
                min={`${formValues.anioInicio}-01-01`}
                max={`${formValues.anioInicio + 1}-12-31`}
              />
            </div>
            <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
              <label className="modal-label" style={{ paddingTop: 0 }}>Fecha de Fin</label>
              <input 
                type="date" 
                className="modal-input" 
                value={formValues.fechaFin || ""} 
                onChange={(e) => handleModalChange("fechaFin", e.target.value)} 
                min={formValues.fechaInicio || `${formValues.anioInicio}-01-01`} 
                max={`${formValues.anioInicio + 1}-12-31`}
              />
            </div>
          </div>

          {/* Botones de Acción */}
          <div className="modal-actions" style={{ marginTop: "30px" }}>
            <button className="modal-btn modal-btn--accept" onClick={guardarAnio}>Aceptar</button>
            <button className="modal-btn modal-btn--cancel" onClick={() => setModalOpen(false)}>Cancelar</button>
          </div>
        </ParamModal>

        <Alert {...alertConfig} onClose={alertConfig.onClose || closeAlert} />
      </ModuleLayout>
    </div>
  );
};

export default AnioEscolarPage;
import { useState, useEffect, useMemo } from "react";
import "./TiposPruebaPage.css";

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
  obtenerTiposPruebaRequest,
  crearTipoPruebaRequest,
  actualizarTipoPruebaRequest
} from "../../api/endpointsParametrizacion";

import { Icon } from '@mdi/react';
import {
  mdiHome, mdiAccount, mdiCalendar, mdiTestTube,
  mdiGuitarElectric, mdiCube, mdiBook, mdiAccountGroup,
} from '@mdi/js';

const GRADOS_ESCOLARES = [
  { id: 1, label: "Primero" }, { id: 2, label: "Segundo" }, { id: 3, label: "Tercero" },
  { id: 4, label: "Cuarto" }, { id: 5, label: "Quinto" }, { id: 6, label: "Sexto" },
  { id: 7, label: "Séptimo" }, { id: 8, label: "Octavo" }, { id: 9, label: "Noveno" },
  { id: 10, label: "Décimo" }, { id: 11, label: "Once" }
];

const TiposPruebaPage = () => {
  const { user, logout } = useAuth();
  
  const [pruebas, setPruebas] = useState([]);
  const [pruebaSeleccionada, setPruebaSeleccionada] = useState(null);
  const [filtroBusqueda, setFiltroBusqueda] = useState("");

  const [searchKey, setSearchKey] = useState(0);
  
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState("crear"); 
  const [formValues, setFormValues] = useState({});
  const [alertConfig, setAlertConfig] = useState({ isOpen: false, type: "info", message: "" });

  const showAlert = (type, message) => setAlertConfig({ isOpen: true, type, message });
  const closeAlert = () => setAlertConfig(prev => ({ ...prev, isOpen: false }));

  const cargarPruebas = async () => {
    try {
      const response = await obtenerTiposPruebaRequest();
      setPruebas(response.data || []);
      setPruebaSeleccionada(null); 
    } catch (error) {
      showAlert("error", "No se pudieron cargar las pruebas.");
    }
  };

  useEffect(() => { cargarPruebas(); }, []);

  const abrirModalCrear = () => {
    setModalMode("crear");
    setFormValues({ nombre: "", descripcion: "", rangoSelect: "Todo", gradoMin: 1, gradoMax: 11 });
    setModalOpen(true);
  };

  const abrirModalEditar = () => {
    if (!pruebaSeleccionada) return;
    setModalMode("editar");
    
    let rango = "Personalizado";
    if (pruebaSeleccionada.grado_min === 1 && pruebaSeleccionada.grado_max === 11) rango = "Todo";
    else if (pruebaSeleccionada.grado_min === 1 && pruebaSeleccionada.grado_max === 5) rango = "Primaria";
    else if (pruebaSeleccionada.grado_min === 6 && pruebaSeleccionada.grado_max === 11) rango = "Secundaria";

    setFormValues({
      nombre: pruebaSeleccionada.nombre || "",
      descripcion: pruebaSeleccionada.descripcion || "",
      rangoSelect: rango,
      gradoMin: pruebaSeleccionada.grado_min,
      gradoMax: pruebaSeleccionada.grado_max
    });
    setModalOpen(true);
  };

  const handleModalChange = (key, value) => {
    setFormValues(prev => {
      const updated = { ...prev, [key]: value };
      
      if (key === "rangoSelect") {
        if (value === "Todo") { updated.gradoMin = 1; updated.gradoMax = 11; }
        else if (value === "Primaria") { updated.gradoMin = 1; updated.gradoMax = 5; }
        else if (value === "Secundaria") { updated.gradoMin = 6; updated.gradoMax = 11; }
      }
      return updated;
    });
  };

  const handleGradoManualChange = (tipo, valor) => {
    const val = parseInt(valor, 10);
    setFormValues(prev => {
      let min = prev.gradoMin;
      let max = prev.gradoMax;

      if (tipo === 'min') {
        min = val;
        max = Math.max(min, max);
      } else {
        max = val;
        min = Math.min(min, max);
      }

      let rango = "Personalizado";
      if (min === 1 && max === 11) rango = "Todo";
      else if (min === 1 && max === 5) rango = "Primaria";
      else if (min === 6 && max === 11) rango = "Secundaria";

      return { ...prev, gradoMin: min, gradoMax: max, rangoSelect: rango };
    });
  };

  const guardarPrueba = async () => {
    const currentNombre = (formValues.nombre || "").trim();
    const currentDescripcion = (formValues.descripcion || "").trim();
    const currentMin = formValues.gradoMin;
    const currentMax = formValues.gradoMax;

    if (!currentNombre || !currentDescripcion) {
      return showAlert("warning", "Todos los campos (Prueba y Descripción) son obligatorios.");
    }

    if (currentMin > currentMax) {
      return showAlert("warning", "El grado inicial no puede ser mayor al grado final.");
    }

    const tieneSolapamiento = pruebas.some(p => {
      if (modalMode === "editar" && p.id_tipo_prueba === pruebaSeleccionada.id_tipo_prueba) {
        return false;
      }
      const mismoNombre = p.nombre.toLowerCase().trim() === currentNombre.toLowerCase();
      if (!mismoNombre) return false;

      const cruzado = (currentMin <= p.grado_max && currentMax >= p.grado_min);
      return cruzado;
    });

    if (tieneSolapamiento) {
      return showAlert("error", `Ya existe una prueba llamada "${currentNombre}" que se solapa con el rango de grados seleccionado.`);
    }

    const payload = {
      nombre: currentNombre,
      grado_min: currentMin,
      grado_max: currentMax,
      descripcion: currentDescripcion
    };

    try {
      if (modalMode === "editar") {
        await actualizarTipoPruebaRequest(pruebaSeleccionada.id_tipo_prueba, payload);
        showAlert("success", "Prueba actualizada correctamente.");
      } else {
        await crearTipoPruebaRequest(payload);
        showAlert("success", "Prueba creada correctamente.");
      }
      setModalOpen(false);
      cargarPruebas();
    } catch (error) {
      showAlert("error", error.response?.data?.detail || "Error al guardar el tipo de prueba.");
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
    { key: "id_tipo_prueba", label: "Código",
      render: (val) => <span style={{ fontFamily: 'Roboto, sans-serif', fontWeight: 400 }}>{val}</span>
     },
    { key: "nombre", label: "Prueba" },
    { key: "descripcion", label: "Descripción" },
    {
      key: "rango",
      label: "Rango de Grados",
      render: (_, row) => (
        <span style={{ fontFamily: 'Roboto, sans-serif', fontWeight: 400 }}>
          De {row.grado_min} a {row.grado_max}
        </span>
      )
    }
  ];

  const pruebasFiltradas = useMemo(() => {
    const termino = filtroBusqueda.toLowerCase().trim();
    return pruebas.filter(p => 
      (p.nombre || "").toLowerCase().includes(termino) ||
      (p.descripcion || "").toLowerCase().includes(termino) ||
      (p.id_tipo_prueba || "").toString().includes(termino)
    );
  }, [pruebas, filtroBusqueda]);

  return (
    <div className="dashboard-container">
      <Header title="SISTEMA DE PAZ Y SALVO - NEW CAMBRIDGE SCHOOL" />
      <ModuleLayout
        sidebar={<Sidebar menuItems={menuItems} selectedMenu="Pruebas" user={{ nombre: user?.nombre || "Usuario", rol: user?.rol || "TITULAR" }} logout={logout} />}
      >
        <div className="tipos-prueba-wrapper page-master-wrapper">
          
          <div className="module-toolbar-container">
            <SearchBar
              key={searchKey} 
              fields={[ { key: 'busqueda', label: 'Buscar:', type: 'text' } ]}
              onSearch={(filtros) => {
                setFiltroBusqueda(filtros.busqueda || ""); 
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
                  rows={pruebasFiltradas} 
                  onRowClick={(fila) => setPruebaSeleccionada(fila)}
                  emptyText="No se encontraron pruebas con esa búsqueda"
                  pageSize={10}
                />
              </div>

              <div className="side-actions">
                <ActionButtons
                  filaSeleccionada={pruebaSeleccionada}
                  botones={[
                    { label: "Crear Prueba", onClick: abrirModalCrear, variante: "primary", siempreActivo: true },
                    { label: "Editar Prueba", onClick: abrirModalEditar, variante: "secondary", siempreActivo: false }
                  ]}
                />
              </div>  

            </div>
          </div>
        </div>

        <ParamModal 
          title={modalMode === "crear" ? "CREAR PRUEBA" : "EDITAR PRUEBA"}
          isOpen={modalOpen} 
          onClose={() => setModalOpen(false)}
        >
          {/* Fila 1: Prueba, Descripción y Rango */}
          <div className="tp-modal-flex-row" style={{ display: "flex", gap: "16px", width: "100%" }}>
            
            {/* PRUEBA: Le damos el 30% del espacio */}
            <div style={{ width: "30%", display: "flex", flexDirection: "column" }}>
              <label className="modal-label" style={{ paddingTop: 0 }}>Prueba</label>
              <input type="text" className="modal-input" placeholder="Ej: Saber 11" value={formValues.nombre || ""} onChange={(e) => handleModalChange("nombre", e.target.value)} />
            </div>

            {/* DESCRIPCIÓN: Le damos el 45% del espacio (más grande) */}
            <div style={{ width: "45%", display: "flex", flexDirection: "column" }}>
              <label className="modal-label" style={{ paddingTop: 0 }}>Descripción</label>
              <input type="text" className="modal-input" placeholder="Ej: Examen de estado" value={formValues.descripcion || ""} onChange={(e) => handleModalChange("descripcion", e.target.value)} />
            </div>

            {/* RANGO: Le damos el 25% del espacio (el más pequeño) */}
            <div style={{ width: "25%", display: "flex", flexDirection: "column" }}>
              <label className="modal-label" style={{ paddingTop: 0 }}>Rango</label>
              <select className="modal-input modal-select" value={formValues.rangoSelect || "Todo"} onChange={(e) => handleModalChange("rangoSelect", e.target.value)}>
                <option value="Todo">Todo</option>
                <option value="Primaria">Primaria</option>
                <option value="Secundaria">Secundaria</option>
                <option value="Personalizado">Personalizado</option>
              </select>
            </div>

          </div>

          {/* Fila 2: Selectores de Grado Manuales */}
          <div className="tp-modal-flex-row" style={{ marginTop: "16px" }}>
            <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
              <label className="modal-label" style={{ paddingTop: 0 }}>Grado Inicial</label>
              <select 
                className="modal-input modal-select" 
                value={formValues.gradoMin || 1} 
                onChange={(e) => handleGradoManualChange('min', e.target.value)}
              >
                {GRADOS_ESCOLARES.map(g => <option key={`min-${g.id}`} value={g.id}>{g.label}</option>)}
              </select>
            </div>
            <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
              <label className="modal-label" style={{ paddingTop: 0 }}>Grado Final</label>
              <select 
                className="modal-input modal-select" 
                value={formValues.gradoMax || 11} 
                onChange={(e) => handleGradoManualChange('max', e.target.value)}
              >
                {GRADOS_ESCOLARES.map(g => <option key={`max-${g.id}`} value={g.id}>{g.label}</option>)}
              </select>
            </div>
          </div>

          {/* Fila 3: Visualizador de Grados Iluminados  */}
          <div className="tp-grados-section" style={{ marginTop: "35px" }}> 
            <h4 className="tp-grados-title" style={{ marginBottom: "15px" }}>GRADOS</h4> 
            <div className="tp-grados-grid">
              {GRADOS_ESCOLARES.map(grado => {
                const estaIluminado = grado.id >= (formValues.gradoMin || 1) && grado.id <= (formValues.gradoMax || 11);
                return (
                  <div key={grado.id} className={`tp-grado-caja ${estaIluminado ? 'iluminado' : ''}`}>
                    {grado.label}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Botones de Acción */}
          <div className="modal-actions" style={{ marginTop: "35px" }}>
            <button className="modal-btn modal-btn--accept" onClick={guardarPrueba}>Aceptar</button>
            <button className="modal-btn modal-btn--cancel" onClick={() => setModalOpen(false)}>Cancelar</button>
          </div>
        </ParamModal>
        
        <Alert {...alertConfig} onClose={closeAlert} />
      </ModuleLayout>
    </div>
  );
};

export default TiposPruebaPage;
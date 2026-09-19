import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axiosClient from "../../api/axiosClient";
import ModuleLayout from "../../components/layout/ModuleLayout";
import Sidebar from "../../components/layout/Sidebar";
import Header from "../../components/layout/header";
    import { useAuth } from

"../../api/AuthContext";
import {
  crearIndividualRequest,
  sincronizarEstudiantesRequest,
  sincronizarDocentesRequest,
} from "../../api/importacionService";
import ModalCargaIndividual from "./ModalCargaIndividual";
import Alert from "../../components/shared/Alert";
import Icon from "../../components/common/Icon";
import { mdiHome, mdiRobot, mdiServer, mdiCardAccountDetails, mdiAccountTie, mdiAccountSchool } from "@mdi/js";
import styles from "./ImportacionIndividualPage.module.css";

const REGISTROS_POR_PAGINA = 10;

export default function ImportacionIndividualPage() {
  const { tipo } = useParams();
  const navigate = useNavigate();
  const { user, roles, loadingRoles, logout } = useAuth();

  const isEstudiante = tipo === "estudiante";
  const userName = user?.nombre || "Usuario";
  const rol = roles[0] || (loadingRoles ? "Cargando rol..." : "Sin rol");

  // ── Datos ──────────────────────────────────────────────
  const [registros,   setRegistros]   = useState([]);
  const [salones,     setSalones]     = useState([]);
  const [periodos,    setPeriodos]    = useState([]);
  const [cargando,    setCargando]    = useState(false);

  // ── Filtros ────────────────────────────────────────────
  const [filtCodigo,  setFiltCodigo]  = useState("");
  const [filtNombre,  setFiltNombre]  = useState("");
  const [filtGrado,   setFiltGrado]   = useState("");
  const [filtGrupo,   setFiltGrupo]   = useState("");
  const [filtPeriodo, setFiltPeriodo] = useState("");

  const [appliedFiltros, setAppliedFiltros] = useState({
    codigo: "",
    nombre: "",
    grado: "",
    grupo: "",
    periodo: ""
  });

  // ── UI ─────────────────────────────────────────────────
  const [paginaActual,     setPaginaActual]     = useState(1);
  const [filaSeleccionada, setFilaSeleccionada] = useState(null);
  const [modalAbierto,     setModalAbierto]     = useState(false);
  const [modoModal,        setModoModal]        = useState("crear");
  const [alertInfo,        setAlertInfo]        = useState({ isOpen: false, type: "", message: "" });

  const showAlert  = (type, message) => setAlertInfo({ isOpen: true, type, message });
  const closeAlert = () => setAlertInfo(prev => ({ ...prev, isOpen: false }));

  // ── Lookup map: id_salon → { grado, grupo } ────────────
  const salonMap = useMemo(
    () => Object.fromEntries(salones.map(s => [s.id_salon, s])),
    [salones]
  );

  // ── Opciones de filtro derivadas de los salones cargados
  const gradosUnicos = useMemo(
    () => [...new Set(salones.map(s => s.grado))].sort(),
    [salones]
  );
  const gruposDelFiltroGrado = useMemo(
    () => filtGrado
      ? [...new Set(salones.filter(s => s.grado === filtGrado).map(s => s.grupo))].sort()
      : [...new Set(salones.map(s => s.grupo))].sort(),
    [salones, filtGrado]
  );

  const oppositeTipo = tipo === 'estudiante' ? 'docente' : 'estudiante';
  const oppositeLabel = tipo === 'estudiante' ? 'Docentes' : 'Estudiantes';
  const oppositeIcon = tipo === 'estudiante' ? mdiAccountTie : mdiAccountSchool;

  const menuItems = [
    { label: "Inicio",           path: "/home",                          icon: <Icon icon={mdiHome}             size={1.2} /> },
    { label: "Conexión",         path: `/importacion/${tipo}`,           icon: <Icon icon={mdiRobot}            size={1.5} /> },
    { label: "Carga Masiva",     path: `/importacion/masiva/${tipo}`,    icon: <Icon icon={mdiServer}           size={1.5} /> },
    { label: "Carga Individual", path: `/importacion/individual/${tipo}`,icon: <Icon icon={mdiCardAccountDetails} size={1.5} /> },
    { label: oppositeLabel,      path: `/importacion/${oppositeTipo}`,   icon: <Icon icon={oppositeIcon}        size={1.5} /> }
  ];

  // ── Fetch registros ────────────────────────────────────
  const fetchRegistros = useCallback(async (periodoId = "", showErrorAlert = true) => {
    setCargando(true);
    try {
      let data = [];
      if (isEstudiante) {
        const url = periodoId
          ? `/api/estudiantes/periodo/${periodoId}?limit=500`
          : "/api/estudiantes?limit=500";
        const res = await axiosClient.get(url);
        data = res.data;
      } else {
        const res = await axiosClient.get("/api/usuarios?limit=500");
        data = res.data;
      }
      setRegistros(data);
      setPaginaActual(1);
      setFilaSeleccionada(null);
    } catch {
      if (showErrorAlert) {
        showAlert("error", "No se pudieron cargar los registros.");
      }
    } finally {
      setCargando(false);
    }
  }, [isEstudiante]);

  useEffect(() => {
    fetchRegistros("", false);
    axiosClient.get("/api/salones?limit=500")
      .then(r => setSalones(r.data))
      .catch(() => {});
    axiosClient.get("/api/parametrizacion/anio-escolar")
      .then(r => setPeriodos(r.data))
      .catch(() => {});
  }, [fetchRegistros]);

  // ── Cambio de período (Solo guarda estado local hasta Buscar) ───
  const handlePeriodoChange = (e) => {
    const val = e.target.value;
    setFiltPeriodo(val);
    setFiltGrado("");
    setFiltGrupo("");
  };

  const handleBuscar = () => {
    if (filtPeriodo !== appliedFiltros.periodo) {
      fetchRegistros(filtPeriodo, true);
    }
    setAppliedFiltros({
      codigo: filtCodigo,
      nombre: filtNombre,
      grado: filtGrado,
      grupo: filtGrupo,
      periodo: filtPeriodo
    });
    setPaginaActual(1);
  };

  const handleLimpiar = () => {
    setFiltCodigo("");
    setFiltNombre("");
    setFiltGrado("");
    setFiltGrupo("");
    setFiltPeriodo("");
    
    if (appliedFiltros.periodo !== "") {
      fetchRegistros("", true);
    }
    
    setAppliedFiltros({
      codigo: "",
      nombre: "",
      grado: "",
      grupo: "",
      periodo: ""
    });
    setPaginaActual(1);
  };

  // ── Filtrado local (código, nombre, grado, grupo) ──────
  const registrosFiltrados = useMemo(() => {
    return registros.filter(r => {
      const doc    = (r.documento || "").toLowerCase();
      const nombre = (r.nombre    || "").toLowerCase();

      if (appliedFiltros.codigo && !doc.includes(appliedFiltros.codigo.toLowerCase()))    return false;
      if (appliedFiltros.nombre && !nombre.includes(appliedFiltros.nombre.toLowerCase())) return false;

      if (isEstudiante) {
        const salon = salonMap[r.id_salon] || {};
        if (appliedFiltros.grado && salon.grado !== appliedFiltros.grado) return false;
        if (appliedFiltros.grupo && salon.grupo !== appliedFiltros.grupo) return false;
      }
      return true;
    });
  }, [registros, appliedFiltros, isEstudiante, salonMap]);

  // ── Paginación ─────────────────────────────────────────
  const totalPaginas    = Math.ceil(registrosFiltrados.length / REGISTROS_POR_PAGINA);
  const inicio          = (paginaActual - 1) * REGISTROS_POR_PAGINA;
  const registrosPagina = registrosFiltrados.slice(inicio, inicio + REGISTROS_POR_PAGINA);

  // ── Selección de fila ──────────────────────────────────
  const handleSeleccionar = (id) => {
    setFilaSeleccionada(prev => (prev === id ? null : id));
  };

  const abrirModalCrear  = () => { setModoModal("crear");  setModalAbierto(true); };
  const abrirModalEditar = () => { if (!filaSeleccionada) return; setModoModal("editar"); setModalAbierto(true); };
  const cerrarModal      = () => setModalAbierto(false);

  const datosParaEditar = filaSeleccionada
    ? registros.find(r =>
        isEstudiante ? r.id_estudiante === filaSeleccionada : r.id_usuario === filaSeleccionada
      )
    : null;

  // ── Guardar ────────────────────────────────────────────
  const handleGuardar = async (payload) => {
    try {
      if (modoModal === "crear") {
        const res = await crearIndividualRequest(tipo, payload);
        const ejecucionId = res.data.ejecucion_id;
        if (isEstudiante) {
          await sincronizarEstudiantesRequest(ejecucionId);
        } else {
          await sincronizarDocentesRequest(ejecucionId);
        }
        showAlert("success", "Registro creado y sincronizado correctamente.");
      } else {
        const id  = isEstudiante ? datosParaEditar.id_estudiante : datosParaEditar.id_usuario;
        const url = isEstudiante ? `/api/estudiantes/${id}` : `/api/usuarios/${id}`;
        await axiosClient.put(url, payload);
        showAlert("success", "Registro actualizado correctamente.");
      }
      cerrarModal();
      fetchRegistros(filtPeriodo);
    } catch (err) {
      const msg = err?.response?.data?.detail || "Error al guardar el registro.";
      showAlert("error", msg);
    }
  };

  // ── Render fila ────────────────────────────────────────
  const renderFila = (r) => {
    const id = isEstudiante ? r.id_estudiante : r.id_usuario;
    const seleccionado = filaSeleccionada === id;

    if (isEstudiante) {
      const salon = salonMap[r.id_salon] || {};
      return (
        <tr
          key={id}
          className={seleccionado ? styles.filaSeleccionada : ""}
          onClick={() => handleSeleccionar(id)}
        >
          <td>{seleccionado ? "✓" : ""}</td>
          <td>{r.documento}</td>
          <td>{r.nombre}</td>
          <td>{salon.grado || "—"}</td>
          <td>{salon.grupo || "—"}</td>
          <td>{r.telefono_acudiente || "—"}</td>
        </tr>
      );
    }

    return (
      <tr
        key={id}
        className={seleccionado ? styles.filaSeleccionada : ""}
        onClick={() => handleSeleccionar(id)}
      >
        <td>{seleccionado ? "✓" : ""}</td>
        <td>{r.documento}</td>
        <td>{r.nombre}</td>
        <td>{r.roles?.join(", ") || "—"}</td>
        <td>{r.estado ? "Activo" : "Inactivo"}</td>
      </tr>
    );
  };

  return (
    <div>
      <Header title="SISTEMA DE PAZ Y SALVO - NEW CAMBRIGDE SCHOOL" />
      <ModuleLayout
        sidebar={
          <Sidebar
            menuItems={menuItems}
            selectedMenu="Carga Individual"
            user={{ nombre: userName, rol }}
            loadingRoles={loadingRoles}
            logout={logout}
          />
        }
      >
        <div className={styles.container}>

          {/* CABECERA TIPO */}
          <div className={styles.cabeceraSeccion}>
            <div 
              className={styles.badgeFlag}
              onClick={() => navigate("/importacion")}
              title="Volver a Robot"
            >
              {tipo ? tipo.toUpperCase() : "INDIVIDUAL"}
            </div>
          </div>

          {/* BARRA DE BÚSQUEDA */}
          <div className={styles.barraBusqueda}>
            <div className={styles.grupoFiltro}>
              <label>Código</label>
              <input
                value={filtCodigo}
                onChange={e => setFiltCodigo(e.target.value)}
                placeholder="Buscar..."
              />
            </div>
            <div className={styles.grupoFiltro}>
              <label>Nombre</label>
              <input
                value={filtNombre}
                onChange={e => setFiltNombre(e.target.value)}
                placeholder="Buscar..."
              />
            </div>

            {isEstudiante && (
              <>
                <div className={styles.grupoFiltro}>
                  <label>Grado</label>
                  <select
                    value={filtGrado}
                    onChange={e => { setFiltGrado(e.target.value); setFiltGrupo(""); }}
                  >
                    <option value="">Todos</option>
                    {gradosUnicos.map((g, i) => <option key={i} value={g}>{g}</option>)}
                  </select>
                </div>
                <div className={styles.grupoFiltro}>
                  <label>Grupo</label>
                  <select
                    value={filtGrupo}
                    onChange={e => setFiltGrupo(e.target.value)}
                    disabled={!filtGrado}
                  >
                    <option value="">Todos</option>
                    {gruposDelFiltroGrado.map((g, i) => <option key={i} value={g}>{g}</option>)}
                  </select>
                </div>
              </>
            )}

            <div className={styles.grupoFiltro}>
              <label>Año</label>
              <select value={filtPeriodo} onChange={handlePeriodoChange}>
                <option value="">Todos</option>
                {periodos.map(p => {
                  const anioExtraido = p.fecha_inicio ? new Date(p.fecha_inicio).getFullYear() : (p.nombre || p.id_periodo);
                  return (
                    <option key={p.id_periodo} value={p.id_periodo}>
                      {anioExtraido} {p.activo ? "(Activo)" : ""}
                    </option>
                  );
                })}
              </select>
            </div>

            <div className={styles.grupoFiltro} style={{ flexDirection: 'row', alignItems: 'flex-end', gap: '10px' }}>
              <button className={styles.btnAccion} onClick={handleBuscar} style={{ height: '38px', minWidth: '100px', padding: '0 15px' }}>
                Buscar
              </button>
              <button className={styles.btnAccion} onClick={handleLimpiar} style={{ height: '38px', minWidth: '100px', padding: '0 15px', backgroundColor: 'var(--color-border)' }}>
                Limpiar
              </button>
            </div>
          </div>

          {/* TABLA */}
          <div className={styles.seccionTabla}>
            <table className={styles.tabla}>
              <thead>
                <tr>
                  <th style={{ width: "30px" }}></th>
                  <th>Código</th>
                  <th>Nombre Completo</th>
                  {isEstudiante ? (
                    <>
                      <th>Grado</th>
                      <th>Grupo</th>
                      <th>Contacto de Padre</th>
                    </>
                  ) : (
                    <>
                      <th>Roles</th>
                      <th>Estado</th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody>
                {cargando ? (
                  <tr>
                    <td colSpan={isEstudiante ? 6 : 5} className={styles.celdaCentro}>Cargando...</td>
                  </tr>
                ) : registrosPagina.length === 0 ? (
                  <tr>
                    <td colSpan={isEstudiante ? 6 : 5} className={styles.celdaCentro}>Sin registros</td>
                  </tr>
                ) : (
                  registrosPagina.map(renderFila)
                )}
              </tbody>
            </table>

            {/* PAGINACIÓN */}
            <div className={styles.paginacion}>
              <button
                className={styles.btnPagina}
                onClick={() => setPaginaActual(p => Math.max(1, p - 1))}
                disabled={paginaActual === 1}
              >‹</button>
              <button
                className={styles.btnPagina}
                onClick={() => setPaginaActual(p => Math.min(totalPaginas, p + 1))}
                disabled={paginaActual >= totalPaginas}
              >›</button>
            </div>
          </div>

          {/* BOTONES ACCIÓN */}
          <div className={styles.botonesAccion}>
            <button className={styles.btnAccion} onClick={abrirModalCrear}>
              Agregar {isEstudiante ? "Estudiante" : "Docente"}
            </button>
            <button
              className={styles.btnAccion}
              onClick={abrirModalEditar}
              disabled={!filaSeleccionada}
            >
              Editar {isEstudiante ? "Estudiante" : "Docente"}
            </button>
          </div>

        </div>
      </ModuleLayout>

      {modalAbierto && (
        <ModalCargaIndividual
          tipo={tipo}
          modo={modoModal}
          datosIniciales={modoModal === "editar" ? datosParaEditar : null}
          salones={salones}
          salonMap={salonMap}
          onGuardar={handleGuardar}
          onCancelar={cerrarModal}
        />
      )}

      <Alert {...alertInfo} onClose={closeAlert} />
    </div>
  );
}

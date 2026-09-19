import React, { useState, useEffect, useMemo } from 'react';
import { allaniosacademicosRequest } from '../../api/endpoints';
import {
  allestudiantesbyperiodoRequest,
  allsalonesbyperiodoRequest,
  allmatriculasbyperiodoRequest,
  alldetallematriculabyperiodoRequest,
  alltipoconceptoRequest,
  crearDetalleRequest
} from '../../api/endpointsTesoreria';
import Icon from '@mdi/react';
import { mdiHome } from "@mdi/js";
import { useAuth } from "../../api/AuthContext";
import Header from "../../components/layout/header";
import ModuleLayout from "../../components/layout/ModuleLayout";
import Sidebar from "../../components/layout/Sidebar";
import SearchBar from "../../components/shared/searchBar";
import DataTable from "../../components/shared/DataTable";
import ActionButtons from "../../components/shared/ActionButtons";
import Modal from "../../components/shared/Modal";
import Alert from "../../components/shared/Alert";

const TesoreriaDetalleComponent = ({ tiporecibed, modulosRecibed, selectedMenu }) => {
  const [selectedModule, setSelectedModule] = useState(selectedMenu);
  const [estudiantes, setEstudiantes] = useState([]);
  const [estudiantesFiltrados, setEstudiantesFiltrados] = useState([]);
  const [estudiantesMatriculados, setEstudiantesMatriculados] = useState([]);
  const [salones, setSalones] = useState([]);
  const [matriculas, setMatriculas] = useState([]);
  const [periodos, setPeriodos] = useState([]);
  const [detalles, setDetalles] = useState([]);
  const [fila, setFila] = useState(null);
  const [modal, setModal] = useState(false);
  const [modalVer, setModalVer] = useState(false);
  const [alert, setAlert] = useState({ isOpen: false, type: "", title: "", message: "" });
  const [cargandoPeriodos, setCargandoPeriodos] = useState(true);
  const [cargandoTipo, setCargandoTipo] = useState(true);
  const [tipo, setTipo] = useState([]);
  const [mesesSeleccionados, setMesesSeleccionados] = useState({});
  const [filtros, setFiltros] = useState({
    documento: "",
    nombre: "",
    Grado: "",
    Grupo: "",
    Periodo: ""
  });

  // =========================
  // Autenticación y roles globales
  // =========================
  const { user, roles, loadingRoles, logout } = useAuth();
  const userName = user?.nombre || "Usuario";
  const rol = roles[0] || (loadingRoles ? "Cargando rol..." : "Sin rol");
  const rolespermitidos = ["admin", "tesoreria"];

  // =========================
  // Mapeos para acceso rápido
  // =========================
  const salonesMap = useMemo(() => {
    const map = {};
    salones.forEach(s => { map[s.id_salon] = s; });
    return map;
  }, [salones]);

  const matriculasMap = useMemo(() => {
    const map = {};
    matriculas.forEach(m => { map[m.id_estudiante] = m; });
    return map;
  }, [matriculas]);

  const periodoMapname = useMemo(() => {
    const map = {};
    periodos.forEach(p => { map[p.nombre] = p; });
    return map;
  }, [periodos]);

  const tipoMap = useMemo(() => {
    const map = {};
    tipo.forEach(t => { map[t.nombre] = t; });
    return map;
  }, [tipo]);

  const meses = [
    "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
    "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre"
  ];

  // =========================
  // Carga de períodos y tipos (solo una vez)
  // =========================
  const cargarPeriodos = async () => {
    try {
      const res = await allaniosacademicosRequest();
      setPeriodos(res.data);
      const periodoActivo = res.data.find(p => p.activo) || res.data[0];
      setFiltros(prev => ({ ...prev, Periodo: periodoActivo?.nombre || "" }));
      setCargandoPeriodos(false);
    } catch (error) {
      console.error("Error cargando periodos:", error);
      setCargandoPeriodos(false);
    }
  };

  const cargarTipos = async () => {
    try {
      const res = await alltipoconceptoRequest();
      setTipo(res.data);
      setCargandoTipo(false);
    } catch (error) {
      console.error("Error cargando tipos:", error);
      setCargandoTipo(false);
    }
  };

  useEffect(() => {
    cargarPeriodos();
    cargarTipos();
  }, []);

  // =========================
  // Carga de datos según período y tipo
  // =========================
  const cargarEstudiantes = async (id_periodo) => {
    try {
      const res = await allestudiantesbyperiodoRequest(id_periodo);
      setEstudiantes(res.data);
    } catch (error) {
      console.error("Error cargando estudiantes:", error);
    }
  };

  const cargarSalones = async (id_periodo) => {
    try {
      const res = await allsalonesbyperiodoRequest(id_periodo);
      setSalones(res.data);
    } catch (error) {
      console.error("Error cargando salones:", error);
    }
  };

  const cargarMatriculas = async (id_periodo) => {
    try {
      const res = await allmatriculasbyperiodoRequest(id_periodo);
      setMatriculas(res.data);
    } catch (error) {
      console.error("Error cargando matrículas:", error);
    }
  };

  const cargarDetalles = async (id_periodo, id_tipo) => {
    try {
      const res = await alldetallematriculabyperiodoRequest(id_periodo, id_tipo);
      setDetalles(res.data);
    } catch (error) {
      console.error("Error cargando detalle matrículas:", error);
    }
  };

  // Disparar carga cuando cambia el período o el tipo
  useEffect(() => {
    const idPeriodoActual = periodoMapname[filtros.Periodo]?.id_periodo;
    const tipoExiste = tipoMap[tiporecibed] && !cargandoTipo;
    if (idPeriodoActual && tipoExiste) {
      const id_tipo = tipoMap[tiporecibed]?.id_tipo;
      cargarEstudiantes(idPeriodoActual);
      cargarSalones(idPeriodoActual);
      cargarMatriculas(idPeriodoActual);
      cargarDetalles(idPeriodoActual, id_tipo);
    }
  }, [filtros.Periodo, tipo, tiporecibed, cargandoTipo, periodoMapname, tipoMap]);

  // Filtrar estudiantes matriculados activos
  useEffect(() => {
    const matriculadosActivos = estudiantes.filter(e =>
      matriculasMap[e.id_estudiante] && matriculasMap[e.id_estudiante]?.estado === 'activa'
    );
    setEstudiantesMatriculados(matriculadosActivos);
    setEstudiantesFiltrados(matriculadosActivos);

    const nuevosMeses = {};
    matriculadosActivos.forEach(est => {
      if (!mesesSeleccionados[est.id_estudiante]) {
        nuevosMeses[est.id_estudiante] = "Enero";
      }
    });
    if (Object.keys(nuevosMeses).length > 0) {
      setMesesSeleccionados(prev => ({ ...prev, ...nuevosMeses }));
    }
  }, [estudiantes, matriculasMap]);

  const FiltrarEstudiantes = (filtros) => {
    setEstudiantesFiltrados(estudiantesMatriculados.filter(e => {
      const cumpleDocumento = e.documento.toString().includes(filtros.documento);
      const cumpleNombre = e.nombre.toLowerCase().includes(filtros.nombre.toLowerCase());
      const cumpleGrado = filtros.Grado ? (salonesMap[e.id_salon]?.grado).toString() === filtros.Grado : true;
      const cumpleGrupo = filtros.Grupo ? (salonesMap[e.id_salon]?.grupo).toString() === filtros.Grupo : true;
      return cumpleDocumento && cumpleNombre && cumpleGrado && cumpleGrupo;
    }));
  };

  const isDisabledValidarPago = () => {
    if (!fila || !fila.id_estudiante) return true;
    const matricula = matriculasMap[fila.id_estudiante];
    if (!matricula || matricula.estado !== 'activa') return true;
    const idPeriodoFiltro = periodoMapname[filtros.Periodo]?.id_periodo;
    const salonEstudiante = salonesMap[fila.id_salon];
    if (!salonEstudiante || salonEstudiante.id_periodo !== idPeriodoFiltro) return true;
    const periodoActivo = periodoMapname[filtros.Periodo]?.activo;
    const esAdmin = roles.includes("admin");
    if (!periodoActivo && !esAdmin) return true;
    const mesActual = mesesSeleccionados[fila.id_estudiante]?.toLowerCase();
    const yaPagado = detalles.some(d =>
      d.id_matricula === matricula.id_matricula && d.mes === mesActual
    );
    if (yaPagado) return true;
    const mesActualNombre = mesesSeleccionados[fila.id_estudiante];
    const indiceMes = meses.indexOf(mesActualNombre);
    const mesAnterior = meses[indiceMes - 1]?.toLowerCase();
    const mesAnteriorPagado = Object.values(detalles).some(d =>
      d.id_matricula === matricula.id_matricula && d.mes === mesAnterior
    );
    if (mesActualNombre !== 'Enero' && !mesAnteriorPagado) return true;
    return false;
  };

  const isDisabledVer = () => {
    if (!fila || !fila.id_estudiante) return true;
    const salonEstudiante = salonesMap[fila.id_salon];
    const idPeriodoFiltro = periodoMapname[filtros.Periodo]?.id_periodo;
    return !salonEstudiante || salonEstudiante.id_periodo !== idPeriodoFiltro;
  };

  const crearDetalle = async () => {
    if (!fila || !fila.id_estudiante) {
      console.error("No hay ningún estudiante seleccionado.");
      return;
    }
    const matricula = matriculasMap[fila.id_estudiante];
    if (!matricula) {
      showAlert("error", "El estudiante no tiene una matrícula activa en este período.");
      return;
    }
    const id_tipo = tipoMap[tiporecibed]?.id_tipo;
    if (!id_tipo) {
      showAlert("error", "Tipo de concepto no válido.");
      return;
    }
    try {
      await crearDetalleRequest(
        matricula.id_matricula,
        id_tipo,
        mesesSeleccionados[fila.id_estudiante]?.toLowerCase()
      );
      const idPeriodoActual = periodoMapname[filtros.Periodo]?.id_periodo;
      await cargarDetalles(idPeriodoActual, id_tipo);
      setFila(null);
      showAlert("success", "Pago registrado correctamente.");
    } catch (error) {
      console.error(`Error al crear el detalle ${tiporecibed}:`, error);
      showAlert("error", error.response?.data?.detail || "Error al registrar el pago");
    }
  };

  const modulos = modulosRecibed || [
    { label: "Inicio", icon: <Icon path={mdiHome} />, path: "/home" },
  ];

  const showAlert = (type, message, title = "") =>
    setAlert({ isOpen: true, type, message, title });

  const closeAlert = () =>
    setAlert((prev) => ({ ...prev, isOpen: false }));

  // =========================
  // Renderizado principal (siempre se muestra la estructura)
  // =========================
  const sidebar = (
    <Sidebar
      menuItems={modulos.filter(modulo => {
        if (!modulo) return false;
        if (!modulo.roles || !Array.isArray(modulo.roles) || modulo.roles.length === 0) return true;
        return roles.some(r => modulo.roles.includes(r));
      })}
      user={{ nombre: userName, rol }}
      selectedMenu={selectedModule}
      loadingRoles={loadingRoles}
      onLogout={logout}
    />
  );

  const acciones = (
    <ActionButtons
      filaSeleccionada={fila}
      botones={
        roles.some(r => rolespermitidos.includes(r)) && tipoMap[tiporecibed]
          ? [
              {
                label: "Validar Pago",
                onClick: () => setModal(true),
                siempreActivo: false,
                variante: "primary",
                disabled: isDisabledValidarPago()
              },
              {
                label: "Ver",
                onClick: () => setModalVer(true),
                siempreActivo: false,
                variante: "secondary",
                disabled: isDisabledVer()
              }
            ]
          : []
      }
    />
  );

  // Mientras cargan los datos esenciales, mostrar la página con un área de contenido vacía
  if (cargandoPeriodos || cargandoTipo) {
    return (
      <div>
        <Header title="SISTEMA DE PAZ Y SALVO - NEW CAMBRIDGE SCHOOL" />
        <ModuleLayout sidebar={sidebar} actions={acciones}>
          <div style={{ minHeight: '400px' }}></div>
        </ModuleLayout>
      </div>
    );
  }

  // Una vez cargados, verificar existencia del tipo
  if (!tipoMap[tiporecibed]) {
    return (
      <div>
        <Header title="SISTEMA DE PAZ Y SALVO - NEW CAMBRIDGE SCHOOL" />
        <ModuleLayout sidebar={sidebar} actions={acciones}>
          <div className="status-message">
            Error: tipo detalle "{tiporecibed}" no existe en la base de datos.
          </div>
        </ModuleLayout>
      </div>
    );
  }

  if (!roles.some(r => rolespermitidos.includes(r))) {
    return (
      <div>
        <Header title="SISTEMA DE PAZ Y SALVO - NEW CAMBRIDGE SCHOOL" />
        <ModuleLayout sidebar={sidebar} actions={acciones}>
          <div className="status-message status-message--empty">
            Tu usuario no tiene permisos para acceder a este módulo.
          </div>
        </ModuleLayout>
      </div>
    );
  }

  // Renderizado normal con todos los datos
  return (
    <div>
      <Header title="SISTEMA DE PAZ Y SALVO - NEW CAMBRIDGE SCHOOL" />
      <ModuleLayout sidebar={sidebar} actions={acciones}>
        <div>
          <SearchBar
            fields={[
              { key: "documento", label: "Código", type: "number", maxLength: 10 },
              { key: "nombre", label: "Nombre", type: "text", maxLength: 100 },
              {
                key: "Grado",
                label: "Grado",
                type: "select",
                options: Array.from(new Set(
                  Object.values(salonesMap)
                    .filter(s => s.id_periodo === periodoMapname[filtros.Periodo]?.id_periodo)
                    .map(s => s.grado).filter(Boolean)
                ))
              },
              {
                key: "Grupo",
                label: "Grupo",
                type: "select",
                options: Array.from(new Set(
                  Object.values(salonesMap)
                    .filter(s => (s.grado).toString() === filtros.Grado)
                    .map(s => s.grupo).filter(Boolean)
                ))
              },
              {
                key: "Periodo",
                label: "Período",
                type: "select",
                options: periodos.map(p => p.nombre).filter(Boolean)
              }
            ]}
            initialValues={{ Periodo: periodos[0]?.nombre }}
            onChange={(key, value) => {
              setFiltros(prev => {
                const nuevos = { ...prev, [key]: value };
                if (key === "Grado") nuevos.Grupo = "";
                if (key === "Periodo") {
                  nuevos.Grado = "";
                  nuevos.Grupo = "";
                }
                return nuevos;
              });
            }}
            onSearch={(f) => {
              FiltrarEstudiantes(f);
              setFiltros(f);
              setFila(null);
            }}
            cleanFilter={{ documento: "", nombre: "", Grado: "", Grupo: "", Periodo: filtros.Periodo }}
          />

          <DataTable
            key={detalles.length}
            pageSize={10}
            columns={[
              { key: "documento", label: "Código",
                render: (value) => <span style={{ fontFamily: 'Roboto, sans-serif', fontWeight: 400 }}>{value}</span>
               },
              { key: "nombre", label: "Nombre" },
              {
                key: "grado",
                label: "Grado",
                render: (_, val) => <span>{salonesMap[val.id_salon]?.grado}</span>
              },
              {
                key: "grupo",
                label: "Grupo",
                render: (_, val) => <span>{salonesMap[val.id_salon]?.grupo}</span>
              },
              {
                key: "mes",
                label: "Mes",
                render: (_, val) => {
                  const idEst = val.id_estudiante;
                  return (
                    <select
                      value={mesesSeleccionados[idEst] || "Enero"}
                      onChange={(e) => setMesesSeleccionados(prev => ({ ...prev, [idEst]: e.target.value }))}
                      className="form-select"
                    >
                      {meses.map((m, idx) => <option key={idx} value={m}>{m}</option>)}
                    </select>
                  );
                }
              },
              {
                key: "pago",
                label: "Pago",
                render: (_, val) => {
                  const matricula = matriculasMap[val.id_estudiante];
                  const mesActual = mesesSeleccionados[val.id_estudiante]?.toLowerCase();
                  const pagado = matricula && detalles.some(d =>
                    d.id_matricula === matricula.id_matricula && d.mes === mesActual
                  );
                  return <span className={pagado ? "badge--ok" : "badge--no"}>{pagado ? "Pagado" : "Pendiente"}</span>;
                }
              },
              {
                key: "fecha_pago",
                label: "Fecha de Pago",
                render: (_, val) => {
                  const matricula = matriculasMap[val.id_estudiante];
                  const mesActual = mesesSeleccionados[val.id_estudiante]?.toLowerCase();
                  const detalle = matricula && detalles.find(d =>
                    d.id_matricula === matricula.id_matricula && d.mes === mesActual
                  );
                  const fecha = detalle?.created_at 
                    ? new Date(matricula.created_at).toLocaleDateString('es-CO', {day: '2-digit', month: '2-digit', year: 'numeric'})
                    : "---";
                  return <span style={{ fontFamily: 'Roboto, sans-serif', fontWeight: 400 }}>{fecha}</span>;
                }
              }
            ]}
            rows={estudiantesFiltrados}
            onRowClick={(f) => setFila(f)}
          />
        </div>
      </ModuleLayout>

      <Modal
        title={"Validar Pago"}
        fields={[{ key: "label", type: "label", label: `¿Confirmas que el estudiante ${fila?.nombre || ""} ha realizado el pago del mes de ${mesesSeleccionados[fila?.id_estudiante] || ""}?` }]}
        isOpen={modal}
        onAccept={() => { setModal(false); crearDetalle(); }}
        onCancel={() => setModal(false)}
      />
      <Alert {...alert} onClose={closeAlert} />
      <Modal
        title={selectedMenu}
        fields={[
          { key: "nombre", type: "label", label: `Nombre: ${fila?.nombre}` },
          { key: "documento", type: "label", label: `Código: ${fila?.documento}` },
          {
            key: "card",
            type: "card",
            values: meses,
            validatevalues: detalles
              .filter(d => d.id_matricula === matriculasMap[fila?.id_estudiante]?.id_matricula)
              .map(d => d.mes)
          }
        ]}
        isOpen={modalVer}
        onAccept={() => setModalVer(false)}
        onCancel={() => setModalVer(false)}
      />
    </div>
  );
};

export default TesoreriaDetalleComponent;
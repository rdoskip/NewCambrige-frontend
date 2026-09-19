import React, { useState, useEffect } from 'react';
import { allaniosacademicosRequest } from '../../api/endpoints';
import {
  allestudiantesbyperiodoRequest,
  allsalonesbyperiodoRequest,
  allmatriculasbyperiodoRequest,
  crearMatriculaRequest
} from '../../api/endpointsTesoreria';
import { Icon } from '@mdi/react';
import { mdiHome,  mdiHandCoin, mdiBookEducation, mdiNotebookEdit  } from "@mdi/js";
import { useAuth } from "../../api/AuthContext";
import Header from "../../components/layout/header";
import ModuleLayout from "../../components/layout/ModuleLayout";
import Sidebar from "../../components/layout/Sidebar";
import SearchBar from "../../components/shared/searchBar";
import DataTable from "../../components/shared/DataTable";
import ActionButtons from "../../components/shared/ActionButtons";
import Modal from "../../components/shared/Modal";
import Alert from "../../components/shared/Alert";

const TesoreriaMatricula = () => {
  const [selectedMenu, setSelectedMenu] = useState("Matrícula");
  const [estudiantes, setEstudiantes] = useState([]);
  const [estudiantesFiltrados, setEstudiantesFiltrados] = useState([]);
  const [salones, setSalones] = useState([]);
  const [matriculas, setMatriculas] = useState([]);
  const [periodos, setPeriodos] = useState([]);
  const [fila, setFila] = useState(null);
  const [modal, setModal] = useState(false);
  const [alert, setAlert] = useState({ isOpen: false, type: "", title: "", message: "" });
  const [cargandoPeriodos, setCargandoPeriodos] = useState(true);
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
  // Carga de períodos
  // =========================
  const cargarPeriodos = async () => {
    try {
      const res = await allaniosacademicosRequest();
      setPeriodos(res.data);
      setFiltros(prev => ({ ...prev, Periodo: res.data[0]?.nombre || "" }));
      setCargandoPeriodos(false);
    } catch (error) {
      console.error("Error cargando periodos:", error);
      setCargandoPeriodos(false);
    }
  };

  useEffect(() => {
    cargarPeriodos();
  }, []);

  // =========================
  // Carga de datos según período
  // =========================
  const cargarEstudiantes = async (id_periodo) => {
    try {
      const res = await allestudiantesbyperiodoRequest(id_periodo);
      setEstudiantes(res.data);
      setEstudiantesFiltrados(res.data);
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

  // Reconstruir mapeos cuando cambian los datos
  const salonesMap = {};
  salones.forEach(s => { salonesMap[s.id_salon] = s; });
  const matriculasMap = {};
  matriculas.forEach(m => { matriculasMap[m.id_estudiante] = m; });
  const periodoMapname = {};
  periodos.forEach(p => { periodoMapname[p.nombre] = p; });

  useEffect(() => {
    const idPeriodoActual = periodoMapname[filtros.Periodo]?.id_periodo;
    if (idPeriodoActual) {
      cargarEstudiantes(idPeriodoActual);
      cargarSalones(idPeriodoActual);
      cargarMatriculas(idPeriodoActual);
    }
  }, [filtros.Periodo, periodos]); // Dependencia en periodos para actualizar mapa

  // =========================
  // Filtrado de estudiantes
  // =========================
  const FiltrarEstudiantes = (filtros) => {
    setEstudiantesFiltrados(estudiantes.filter(e => {
      const cumpleDocumento = e.documento.toString().includes(filtros.documento);
      const cumpleNombre = e.nombre.toLowerCase().includes(filtros.nombre.toLowerCase());
      const cumpleGrado = filtros.Grado ? (salonesMap[e.id_salon]?.grado).toString() === filtros.Grado : true;
      const cumpleGrupo = filtros.Grupo ? (salonesMap[e.id_salon]?.grupo).toString() === filtros.Grupo : true;
      return cumpleDocumento && cumpleNombre && cumpleGrado && cumpleGrupo;
    }));
  };

  // =========================
  // Creación de matrícula
  // =========================
  const crearMatricula = async () => {
    if (!fila || !fila.id_estudiante) {
      console.error("No hay ningún estudiante seleccionado.");
      return;
    }
    try {
      await crearMatriculaRequest(
        Number(fila.id_estudiante),
        Number(salonesMap[fila.id_salon]?.id_periodo)
      );
      const idPeriodoActual = periodoMapname[filtros.Periodo]?.id_periodo;
      if (idPeriodoActual) {
        cargarMatriculas(idPeriodoActual);
      }
      setFila(null);
      showAlert("success", "Pago registrado correctamente.");
    } catch (error) {
      console.error("Error al crear la matrícula:", error);
      showAlert("error", error.response?.data?.detail || "Error al registrar el pago");
    }
  };

  // =========================
  // Configuración del sidebar
  // =========================
  const modulos = [
    { label: "Inicio", icon: <Icon path={mdiHome} />, path: "/home" },
    { label: "Matrícula", icon: <Icon path={mdiHandCoin} />, path: "/tesoreria/matricula", roles: ["admin", "tesoreria"] },
    { label: "Pensión", icon: <Icon path={mdiBookEducation} />, path: "/tesoreria/pension", roles: ["admin", "tesoreria"] },
    { label: "Papelería", icon: <Icon path={mdiNotebookEdit} />, path: "/tesoreria/papeleria", roles: ["admin", "tesoreria"] },
  ];

  const showAlert = (type, message, title = "") =>
    setAlert({ isOpen: true, type, message, title });

  const closeAlert = () =>
    setAlert((prev) => ({ ...prev, isOpen: false }));

  // =========================
  // Renderizado principal (sin mensaje de carga)
  // =========================
  const sidebar = (
    <Sidebar
      menuItems={modulos.filter(modulo => {
        if (!modulo) return false;
        if (!modulo.roles || !Array.isArray(modulo.roles) || modulo.roles.length === 0) return true;
        return roles.some(r => modulo.roles.includes(r));
      })}
      selectedMenu={selectedMenu}
      user={{ nombre: userName, rol }}
      loadingRoles={loadingRoles}
      onLogout={logout}
    />
  );

  const acciones = (
    <ActionButtons
      filaSeleccionada={fila}
      botones={
        roles.some(r => rolespermitidos.includes(r))
          ? [
              {
                label: "Validar Pago",
                onClick: () => setModal(true),
                siempreActivo: false,
                variante: "primary",
                disabled:
                  matriculasMap[fila?.id_estudiante] ||
                  !periodoMapname[filtros.Periodo]?.activo ||
                  (fila && salonesMap[fila.id_salon]?.id_periodo !== periodoMapname[filtros.Periodo]?.id_periodo)
              }
            ]
          : []
      }
    />
  );

  // Mientras cargan los datos esenciales (períodos), mostrar layout vacío
  if (cargandoPeriodos) {
    return (
      <div>
        <Header title="SISTEMA DE PAZ Y SALVO - NEW CAMBRIDGE SCHOOL" />
        <ModuleLayout sidebar={sidebar} actions={acciones}>
          <div style={{ minHeight: '400px' }}></div>
        </ModuleLayout>
      </div>
    );
  }

  // Una vez cargados, verificar permisos
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

  // Renderizado completo
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
            key={matriculas.length}
            pageSize={10}
            columns={[
              { key: "documento", label: "Código",
                render: (value) => <span style={{ fontFamily: 'Roboto, sans-serif', fontWeight: 400 }}>{value}</span>},
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
                key: "pago",
                label: "Pago",
                render: (_, val) => {
                  const matricula = matriculasMap[val.id_estudiante];
                  let estado = matricula?.estado;
                  let texto = "Pendiente";
                  let clase = "badge--no";
                  if (estado === "activa") {
                    texto = "Pagado";
                    clase = "badge--ok";
                  } else if (estado && estado !== "activa") {
                    texto = estado;
                    clase = "badge--no";
                  }
                  return <span className={clase}>{texto}</span>;
                }
              },
              {
                key: "fecha_pago",
                label: "Fecha de Pago",
                render: (_, val) => {
                  const matricula = matriculasMap[val.id_estudiante];
                  const fecha = matricula?.estado === "activa" && matricula?.created_at
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
      <Alert {...alert} onClose={closeAlert} />
      <Modal
        title={"Validar Pago"}
         fields={[{ key: "label", type: "label", label:`¿Confirmas que el estudiante ${fila?.nombre || ""} ha realizado el pago de la matrícula?`  }]}
        isOpen={modal}
        onAccept={() => {
          crearMatricula();
          setModal(false);
        }}
        onCancel={() => setModal(false)}
      />
    </div>
  );
};

export default TesoreriaMatricula;
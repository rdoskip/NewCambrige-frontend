
import React, { useState, useEffect } from 'react';
import { allrolesuserRequest, allaniosacademicosRequest } from '../../api/endpoints';
import {descargarPdfDocentesBatchRequest,docentesRectoriaRequest,firmarDocenteRequest,descargarPdfDocenteRequest,imagenFirmaRequest,selloRequest} from "../../api/endpointsRectoria";
import PazYSalvoModal from "./PazYSalvoModal";
import {allsalonesbyperiodoRequest,} from '../../api/endpointsTesoreria';
import { Home } from "lucide-react";
import { useAuth } from "../../api/AuthContext";
import Header from "../../components/layout/header";
import ModuleLayout from "../../components/layout/ModuleLayout";
import Sidebar from "../../components/layout/Sidebar";
import SearchBar from "../../components/shared/searchBar";
import DataTable from "../../components/shared/DataTable";
import ActionButtons from "../../components/shared/ActionButtons";
import Modal from "../../components/shared/Modal";
import { Icon } from '@mdi/react';
import { mdiAccountSchool,mdiHome,mdiHumanMaleBoard } from "@mdi/js";

const RectoriaDocentes = () => {
  const [docentes, setDocentes] = useState([]);
  const [periodos, setPeriodos] = useState([]);
  const rolespermitidos = ["admin", "rectoria"]
  const { user, logout } = useAuth();
  const userName = user?.nombre || "Usuario";
  const idUser = user?.id_usuario;
  const [roles, setRoles] = useState([]);
  const [cargandoRol, setCargandoRol] = useState(true);
  const rol = roles[0] || "Rol Desconocido";
  const [fila, setFila] = useState(null);
  const [modal, setModal] = useState(false);
  const [cargandoPeriodos, setCargandoPeriodos] = useState(true);
  const [filtros, setFiltros] = useState({documento: "",nombre: "",Periodo: ""});
  const [modalValidar, setModalValidar] = useState(false);
  const [estudianteSeleccionado, setEstudianteSeleccionado] = useState(null);
  const [salones, setSalones] = useState([]);
  const [modalVerPazSalvo, setModalVerPazSalvo] = useState(false);
  const [firmasDetalle, setFirmasDetalle] = useState(null);
  const [selloUrl, setSelloUrl] = useState(null);
  const [filtroGrado, setFiltroGrado] = useState("");
  const [filtroGrupo, setFiltroGrupo] = useState("");
  const [firmasUrls, setFirmasUrls] = useState({});
  const [docentesFiltrados, setDocentesFiltrados] = useState([]);
  const selectedMenu = "Docentes";

  const modulos = [
      { label: "Inicio", icon: <Icon path={mdiHome} />, path: "/home" },
      { label: "Estudiantes", icon: <Icon path={mdiAccountSchool} />, path: "/rectoria/estudiantes", roles: ["admin", "rectoria"] },
      { label: "Docentes", icon: <Icon path={mdiHumanMaleBoard} />, path: "/rectoria/docentes", roles: ["admin", "rectoria"] },
    ];
  const periodoMapname = {};
  periodos.forEach(p => {
    periodoMapname[p.nombre] = p;
  });
  const salonesMap = {};
  salones.forEach(s => {
    salonesMap[s.id_salon] = s;
  });
  useEffect(() => {
    const obtenerRoles = async () => {
      if (!idUser) return;
      try {
        setCargandoRol(true);
        const response = await allrolesuserRequest(idUser);
        setRoles(response?.data || []);
      } catch (error) {
        console.error("Error al obtener el rol:", error);
        setRoles([]);
      } finally {
        setCargandoRol(false);
      }
    };
    obtenerRoles();
  }, [idUser]);

const cargarDocentes = async (id_periodo) => {
  try {
    const res = await docentesRectoriaRequest(id_periodo,filtros.nombre,filtros.documento );
    console.log("Respuesta API:", res.data);
    setDocentes(res.data);
    setDocentesFiltrados(res.data);
  } catch (error) {
    console.error("Error cargando docentes:", error);
  }
};

  const cargarPeriodos = async () => {
    try {
      const res = await allaniosacademicosRequest();
      setPeriodos(res.data);
      setFiltros(prev => ({ ...prev, Periodo: res.data[0]?.nombre || "" }));
      setCargandoPeriodos(false);
    } catch (error) {
      console.error("Error cargando periodos:", error);
    }
  };

const cargarSello = async () => {
  try {
    const response = await selloRequest();
    const blob = new Blob(
      [response.data],
      { type: "image/jpeg" }
    );
    const url = URL.createObjectURL(blob);
    setSelloUrl(url);
    return url;
  } catch (error) {
    console.error("Error cargando sello:", error);
    return null;
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

const firmarDocente = async () => {
  if (!fila) {
    alert("Seleccione un docente");
    return;
  }
  try {
    const periodoId =periodoMapname[filtros.Periodo]?.id_periodo;
    await firmarDocenteRequest(
      fila.id_docente,
      periodoId
    );
    await cargarDocentes(periodoId);
    alert("Docente firmado correctamente");
  } catch (error) {
    console.error(error);
    alert(error?.response?.data?.detail ||"Error al firmar docente");
  }
};
const cargarFirma = async (nombreModulo, usuarioId) => {
  try {
    const response =await imagenFirmaRequest(nombreModulo, usuarioId);
    const blob = new Blob(
      [response.data],
      { type: "image/png" }
    );
    return URL.createObjectURL(blob);
  } catch (error) {
    console.error(`No existe firma para ${nombreModulo}`);
    return null;
  }
};

const descargarPazYSalvo = async () => {
  try {
    const periodoId =
      periodoMapname[filtros.Periodo]?.id_periodo;
    let response;
    let nombreArchivo;
    if (fila) {
      response = await descargarPdfDocenteRequest(
        fila.id_docente,
        periodoId
      );
      nombreArchivo = `paz_y_salvo_docente_${fila.id_docente}.pdf`;
    }
    else {
      response = await descargarPdfDocentesBatchRequest(periodoId,filtros.Grado ,filtros.Grupo );
      nombreArchivo = "paz_y_salvo_docentes.zip";
    }
    const blob = new Blob(
      [response.data],
      { type: "application/zip" }
    );
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = nombreArchivo;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  } catch (error) {
    console.error(error);
    alert(
      error?.response?.data?.detail ||
      "Error descargando PDF"
    );
  }
};

const verPazYSalvoDocente = async () => {
  if (!fila) {
    alert("Seleccione un docente");
    return;
  }
  try {
    const idUsuarioFirmante = fila.id_usuario_firmante || null;
    const firmaRectoria =await cargarFirma("rectoria", idUsuarioFirmante);setFirmasDetalle({nombre: fila.nombre,documento: fila.documento,detalle_firmas:[{nombre: "rectoria",firmado: fila.firmado,no_aplica: false } ]});
    setFirmasUrls({rectoria: firmaRectoria});
    setModalVerPazSalvo(true);
  } catch (error) {
    console.error(error);
    alert("Error cargando paz y salvo");
  }
};
  useEffect(() => {
    cargarPeriodos();
  }, []);

  useEffect(() => {
  const idPeriodoActual =
    periodoMapname[filtros.Periodo]?.id_periodo;

  if (idPeriodoActual) {
    cargarDocentes(idPeriodoActual);
    cargarSalones(idPeriodoActual);
  }
}, [filtros.Periodo]);
    useEffect(() => {
      return () => {
        if (selloUrl) {
          URL.revokeObjectURL(selloUrl);
        }
      };
    }, [selloUrl]);

  const filtrarDocentes = (filtrosBusqueda) => {
  setDocentesFiltrados(
    docentes.filter((docente) => {
      const coincideNombre =docente.nombre?.toLowerCase().includes(filtrosBusqueda.nombre.toLowerCase());
      const coincideDocumento =docente.documento?.toString().includes(filtrosBusqueda.documento);
      const coincideGrado =!filtrosBusqueda.Grado ||docente.grado?.toString() === filtrosBusqueda.Grado;
      const coincideGrupo =!filtrosBusqueda.Grupo ||docente.grupo?.toString() === filtrosBusqueda.Grupo;
      return (coincideNombre &&coincideDocumento &&coincideGrado &&coincideGrupo);
    })
  );
};

  return (
    <div >
      <Header title="SISTEMA DE PAZ Y SALVO - NEW CAMBRIDGE SCHOOL" />
      <ModuleLayout
        sidebar={<Sidebar
          menuItems={modulos.filter(modulo => {
            if (!modulo) return false;
            if (!modulo.roles || !Array.isArray(modulo.roles) || modulo.roles.length === 0) return true;
            return roles.some(rol => modulo.roles.includes(rol));
          })}
          
          user={{ nombre: userName, rol: rol }}
          onLogout={logout}
          selectedMenu={selectedMenu}
        />}
        actions={
          <ActionButtons
            filaSeleccionada={fila}
            botones={[
              {label: "Ver Paz y Salvo",onClick: verPazYSalvoDocente,variante: "primary"},
              {label: "Firmar Docente",onClick: () => setModalValidar(true),variante: "primary",disabled: !fila || fila.firmado === true},
              {label: "Descargar Paz y Salvo",onClick: descargarPazYSalvo,variante: "primary",siempreActivo: true}
            ]}
          />
        }
      >
        {cargandoRol || cargandoPeriodos ? (
          <div className="status-message status-message--loading">
            Cargando Modulo Rectoria estudiantes...
          </div>
        ) : (
          roles.some(rol => rolespermitidos.includes(rol)) ? (
            <div>
              <SearchBar
                fields={[
                        {key: "documento",label: "Codigo", type: "number",maxLength: 15},
                        {key: "nombre", label: "Nombre",type: "text",maxLength: 100 },
                        {key: "Grado", label: "Grado", type: "select",
                          options: Array.from(new Set(Object.values(salonesMap)
                            .filter(s => s.id_periodo === periodoMapname[filtros.Periodo]?.id_periodo)
                            .map(s => s.grado).filter(Boolean)))
                        },
                        {key: "Grupo", label: "Grupo", type: "select",options: Array.from(new Set(Object.values(salonesMap).filter(s => (s.grado).toString() === filtros.Grado).map(s => s.grupo).filter(Boolean)))},
                        {key: "Periodo",label: "Periodo",type: "select",options: periodos.map(p => p.nombre)}
                        ]}
                initialValues={{ Periodo: periodos[0]?.nombre }}
                onChange={(key, value) => {
                  setFiltros(prev => {
                    const nuevosFiltros = { ...prev, [key]: value };
                    if (key === "Grado") {
                      nuevosFiltros.Grupo = "";
                    }
                    if (key === "Periodo") {
                      nuevosFiltros.Grado = "";
                      nuevosFiltros.Grupo = "";
                    }
                    return nuevosFiltros;
                  });
                }}
                onSearch={(f) => {
                  filtrarDocentes(f);
                  setFiltros(f);
                  setFila(null);
                }}
                cleanFilter={
                  {
                    documento:"",
                    nombre:"",
                    Grado:"",
                    Grupo:"",
                    Periodo:filtros.Periodo
                    }
                }
              />
              <DataTable
                    key={`${docentes}`}
                    pageSize={10}
                    rows={docentesFiltrados}
                    onRowClick={(f) => setFila(f)}
                    columns={[
                      {
                        key: "documento",
                        label: "Documento",
                        render: (value) => (
                          <span style={{ fontFamily: 'Roboto, sans-serif', fontWeight: 400 }}>
                            {value}
                          </span>
                        )
                      },
                      { key: "nombre", label: "Nombre" },
                      {
                        key: "grado",
                        label: "Grado",
                        render: (_, row) => <span>{row.grado}</span>
                      },
                      {
                        key: "grupo",
                        label: "Grupo",
                        render: (_, row) => <span>{row.grupo}</span>
                      },
                      {
                        key: "estado",
                        label: "Paz y Salvo",
                        render: (_, row) => {
                          const firmado = row.firmado;
                          return (
                            <span style={{
                              color: firmado ? "#44D231" : "#8E2A25",
                              fontWeight: "bold",
                              textTransform: "uppercase"
                            }}>
                              {firmado ? "COMPLETO" : "CRITICO"}
                            </span>
                          );
                        }
                      }
                    ]}
                    />
            </div>
          ) : (
            <div className="status-message status-message--empty">
              Tu usuario no tiene permisos para acceder a este módulo.
            </div>))}
      </ModuleLayout>
            <PazYSalvoModal
              tipo="docente"
              isOpen={modalVerPazSalvo}
              onClose={() => setModalVerPazSalvo(false)}
              estudiante={firmasDetalle}
              selloUrl={selloUrl}
              firmasUrls={firmasUrls}
          />  
          <Modal
            title={`¿Está seguro de que desea otorgar el paz y salvo a ${fila?.nombre || ""}?, Al confirmar esta acción, se validará que la persona ha cumplido con todos los requisitos y obligaciones correspondientes.`}
            isOpen={modalValidar}
            onCancel={() => setModalValidar(false)}
            onAccept={async () => {
              await firmarDocente();
              setModalValidar(false);
            }}
          />
    </div>
  );
};

export default RectoriaDocentes;
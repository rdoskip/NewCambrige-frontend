
import React, { useState, useEffect } from 'react';
import { allrolesuserRequest, allaniosacademicosRequest } from '../../api/endpoints';
import {estudiantesRectoriaRequest,estudianteFirmasRequest,firmarRectoriaEstudianteRequest,descargarPdfEstudianteRequest,descargarPdfEstudiantesBatchRequest,imagenFirmaRequest,selloRequest} from "../../api/endpointsRectoria";
import { Home } from "lucide-react";
import { useAuth } from "../../api/AuthContext";
import Header from "../../components/layout/header";
import ModuleLayout from "../../components/layout/ModuleLayout";
import Sidebar from "../../components/layout/Sidebar";
import SearchBar from "../../components/shared/searchBar";
import DataTable from "../../components/shared/DataTable";
import ActionButtons from "../../components/shared/ActionButtons";
import Modal from "../../components/shared/Modal";
import PazYSalvoModal from "./PazYSalvoModal";
import { Icon } from '@mdi/react';
import { mdiAccountSchool,mdiHome,mdiHumanMaleBoard } from "@mdi/js";


const RectoriaEstudiantes = () => {
  const [estudiantes, setEstudiantes] = useState([]);
  const [estudiantesFiltrados, setEstudiantesFiltrados] = useState([]);
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
  const [filtros, setFiltros] = useState({documento: "",nombre: "",Grado: "",Grupo: "",Periodo: ""});
  const [modalValidarPazSalvo, setModalValidarPazSalvo] = useState(false);
  const [modalValidar, setModalValidar] = useState(false);
  const [modalDescargaExitosa, setModalDescargaExitosa] = useState(false);
  const [estudianteSeleccionado, setEstudianteSeleccionado] = useState(null);
  const [modalVerPazSalvo, setModalVerPazSalvo] = useState(false);
  const [firmasDetalle, setFirmasDetalle] = useState(null);
  const [selloUrl, setSelloUrl] = useState(null);
  const [firmasUrls, setFirmasUrls] = useState({});
  const selectedMenu = "Estudiantes";
 
  const modulos = [
    { label: "Inicio", icon: <Icon path={mdiHome} />, path: "/home" },
    { label: "Estudiantes", icon: <Icon path={mdiAccountSchool} />, path: "/rectoria/estudiantes", roles: ["admin", "rectoria"] },
    { label: "Docentes", icon: <Icon path={mdiHumanMaleBoard} />, path: "/rectoria/docentes", roles: ["admin", "rectoria"] },
  ];

  const periodoMapname = {};
  periodos.forEach(p => {
    periodoMapname[p.nombre] = p;
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
  
  const abrirModalValidacion = (estudiante) => {
  setEstudianteSeleccionado(estudiante);
  setModalValidar(true);
};
const cargarEstudiantes = async (id_periodo) => {
  try {
    const res = await estudiantesRectoriaRequest(id_periodo);
    setEstudiantes(res.data);
    setEstudiantesFiltrados(res.data);
  } catch (error) {
    console.error("Error cargando estudiantes:", error);
  }
}
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


const descargarPazYSalvos = async () => {
  try {
    const periodoId = periodoMapname[filtros.Periodo]?.id_periodo;
    if (fila) {
      const response = await descargarPdfEstudianteRequest(fila.id_estudiante,periodoId);
      const blob = new Blob([response.data], { type: "application/pdf" });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `paz_y_salvo_${fila.documento}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      setModalDescargaExitosa(true);
      return;
    }
    const estudiantesParaDescargar = estudiantesFiltrados;
    if (!estudiantesParaDescargar.length) {
      alert("No hay estudiantes para descargar.");
      return;
    }
    const response = await descargarPdfEstudiantesBatchRequest(periodoId,filtros.Grado,filtros.Grupo);
    const blob = new Blob([response.data], { type: "application/zip" });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `paz_y_salvo_estudiantes.zip`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
    setModalDescargaExitosa(true);
  } catch (error) {
    console.error(error);
    alert("Error al descargar los paz y salvo.");
  }
};

const cargarRecursosPazYSalvo = async (usuarioIdMap = {}) => {
  try {
    const selloResponse = await selloRequest();
    const selloBlob = new Blob(
      [selloResponse.data],
      { type: "image/jpeg" }
    );
    const selloObjectUrl =
      URL.createObjectURL(selloBlob);
    setSelloUrl(selloObjectUrl);
    const modulos = ["banda","titular","uniforme","coordinadora","secretaria","rectoria"];
    const firmas = {};
    for (const modulo of modulos) {
      try {
        const response =
           await imagenFirmaRequest(modulo, usuarioIdMap[modulo]);
        const blob = new Blob(
          [response.data],
          { type: "image/png" }
        );
        firmas[modulo] =
          URL.createObjectURL(blob);
      } catch (err) {
        console.warn(`No existe firma para ${modulo}`);
        firmas[modulo] = null;
      }
    }
    setFirmasUrls(firmas);
    return {sello: selloObjectUrl,firmas
    };
  } catch (error) {
    console.error(
      "Error cargando recursos:",
      error
    );
    return null;
  }
};

const confirmarValidacionPazYSalvo = async () => {
  try {
    const periodoId =
      periodoMapname[filtros.Periodo]?.id_periodo;
    await firmarRectoriaEstudianteRequest(
      fila.id_estudiante,
      periodoId
    );
    await cargarEstudiantes(periodoId);
    setModalValidarPazSalvo(false);
    alert("Paz y Salvo validado correctamente");
  } catch (error) {
    console.error(error);
    alert(
      error?.response?.data?.detail ||
      "Error al validar paz y salvo"
    );
  }
};

const verPazYSalvo = async () => {
  if (!fila) {
    alert("Seleccione un estudiante");
    return;
  }
  try {
    const periodoId =
      periodoMapname[filtros.Periodo]?.id_periodo;
    const firmasResponse =
      await estudianteFirmasRequest(
        fila.id_estudiante,
        periodoId
      );
    const data = firmasResponse.data;
    const usuarioIdMap = {};
    data?.detalle_firmas?.forEach((item) => {
      if (item.id_usuario_firmante) {
        usuarioIdMap[item.nombre] =
          item.id_usuario_firmante;
      }
    });
    await cargarRecursosPazYSalvo(usuarioIdMap);
    setFirmasDetalle(data);
    setModalVerPazSalvo(true);
  } catch (error) {
    console.error(error);
    alert(
      error?.response?.data?.detail ||
      "Error consultando el paz y salvo"
    );
  }
};

  useEffect(() => {
    cargarPeriodos();
  }, []);

  useEffect(() => {
    const idPeriodoActual = periodoMapname[filtros.Periodo]?.id_periodo;
    if (idPeriodoActual) {
      cargarEstudiantes(idPeriodoActual);
    }
  }, [filtros.Periodo]);
    useEffect(() => {
      return () => {
        if (selloUrl) {
          URL.revokeObjectURL(selloUrl);
        }
      };
    }, [selloUrl]);

  
  const FiltrarEstudiantes = (filtros) => {
    setEstudiantesFiltrados(estudiantes.filter(e => {
      const cumpleDocumento = e.documento.toString().includes(filtros.documento);
      const cumpleNombre = e.nombre.toLowerCase().includes(filtros.nombre.toLowerCase());
      const cumpleGrado =filtros.Grado? e.grado?.toString() === filtros.Grado: true;
      const cumpleGrupo =filtros.Grupo? e.grupo?.toString() === filtros.Grupo: true;return cumpleDocumento && cumpleNombre && cumpleGrado && cumpleGrupo;}));
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
              {label: "Validar Paz y Salvo",onClick: () => {if (!fila) {alert("Seleccione un estudiante");return;}setModalValidarPazSalvo(true);},variante: "primary",disabled: !fila || fila.semaforo == "VERDE"},
              {label: "Descargar Paz y Salvo", onClick: descargarPazYSalvos, variante: "primary", siempreActivo: true },
              {label: "Ver Paz y Salvo",onClick: verPazYSalvo,variante: "primary"},
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
                  {key: "documento", label: "Código", type: "number", maxLength: 10 },
                  {key: "nombre", label: "Nombre", type: "text", maxLength: 100 },
                  {key: "Grado", label: "Grado", type: "select",options: Array.from(new Set(estudiantes.map(e => e.grado).filter(Boolean) ))},
                  {key: "Grupo", label: "Grupo", type: "select",options: Array.from(new Set(estudiantes.filter(e => e.grado?.toString() === filtros.Grado).map(e => e.grupo).filter(Boolean)))},
                  {key: "Periodo", label: "Periodo", type: "select",options: Array.from(new Set(Object.values(periodos).map(s => s.nombre).filter(Boolean)))},
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
                onSearch={(f) => { FiltrarEstudiantes(f); setFiltros(f); setFila(null); }}
                cleanFilter={
                  { documento: "", nombre: "", Grado: "", Grupo: "", Periodo: filtros.Periodo }
                }
              />
              <DataTable
                key={`${estudiantes}`}
                pageSize={10}
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
                    key: "semaforo",
                    label: "Paz y Salvo",
                    render: (_, row) => {
                      const estado = row.semaforo;
                      const config = {
                        VERDE:   { texto: "COMPLETO",  color: "#44D231" },
                        AMARILLO: { texto: "PENDIENTE", color: "#DABB1D" },
                        ROJO:    { texto: "CRITICO",   color: "#8E2A25" }
                      };
                      const conf = config[estado] || config.ROJO;
                      return (
                        <span style={{ color: conf.color, fontWeight: "bold", textTransform: "uppercase" }}>
                          {conf.texto}
                        </span>
                      );
                    }
                  }
                ]}
                rows={estudiantesFiltrados}
                onRowClick={(f) => setFila(f)}
              />
            </div>
          ) : (
            <div className="status-message status-message--empty">
              Tu usuario no tiene permisos para acceder a este módulo.
            </div>))}
      </ModuleLayout>
            <PazYSalvoModal
            isOpen={modalVerPazSalvo}
            onClose={() => setModalVerPazSalvo(false)}
            estudiante={firmasDetalle}
            firmas={firmasDetalle?.firmas}
            selloUrl={selloUrl}
            firmasUrls={firmasUrls}
          />
          <Modal
          title={`¿Está seguro de que desea otorgar el paz y salvo a ${fila?.nombre || ""}?, Al confirmar esta acción, se validará que la persona ha cumplido con todos los requisitos y obligaciones correspondientes.`}
          isOpen={modalValidarPazSalvo}
          onCancel={() => setModalValidarPazSalvo(false)}
          onAccept={confirmarValidacionPazYSalvo}
        />
          <Modal
          title="PROCESO COMPLETADO"
          isOpen={modalDescargaExitosa}
          onCancel={() => setModalDescargaExitosa(false)}
          onAccept={() => setModalDescargaExitosa(false)}
          fields={[
            {
              key: "mensaje",
              type: "label",
              label:
                "El documento de paz y salvo ha sido generado y descargado correctamente en formato PDF.",
              className: "modal-success-message"
            }
          ]}
        />
    </div>
  );
};

export default RectoriaEstudiantes;
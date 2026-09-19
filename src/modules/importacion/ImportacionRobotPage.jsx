import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import ModuleLayout from "../../components/layout/ModuleLayout";
import Sidebar from "../../components/layout/Sidebar";
import Header from "../../components/layout/header";
import { useAuth } from "../../api/AuthContext";

import {
  obtenerCredencialesRequest,
  actualizarCredencialesRequest,
  iniciarScrapingEstudiantesRequest,
  iniciarScrapingDocentesRequest,
  sincronizarEstudiantesRequest,
  sincronizarDocentesRequest,
  cancelarScrapingRequest
} from "../../api/importacionService";

import { useImportacionGuard } from "./hooks/useImportacionGuard";
import styles from "./ImportacionRobotPage.module.css";

import Icon from "../../components/common/Icon";
import { mdiHome, mdiRobot, mdiServer, mdiCardAccountDetails, mdiAccountTie, mdiAccountSchool } from '@mdi/js';
import Alert from "../../components/shared/Alert";
import Modal from "../../components/shared/Modal";

// Videos MP4 locales
import videoIdle from "../../assets/importacion/GIF/Robot.mp4";
import videoTrabajando from "../../assets/importacion/GIF/Robot_Trabajando.mp4";
import videoTerminado from "../../assets/importacion/GIF/Robot_Terminado.mp4";
import videoError from "../../assets/importacion/GIF/Robot_Error.mp4";

export default function ImportacionRobotPage() {
  const navigate = useNavigate();
  const { user, roles, loadingRoles, logout } = useAuth();
  
  // :tipo vendrá en la URL (ej. 'estudiante' o 'docente')
  const { tipo } = useParams();
  const tituloBandera = tipo ? tipo.toUpperCase() : "ROBOT";

  // Formulario y Estados
  const [url, setUrl] = useState("");
  const [usuario, setUsuario] = useState("");
  const [password, setPassword] = useState("");
  
  // Estado del robot: 'idle', 'loading', 'success', 'error'
  const [robotState, setRobotState] = useState("idle");
  const [mensaje, setMensaje] = useState("Aún no se ha conectado el robot");
  const [progress, setProgress] = useState(0);

  // Estados del Modal
  const [showModal, setShowModal] = useState(false);
  const [ejecucionInfo, setEjecucionInfo] = useState(null);
  // true cuando la sincronización o cancelación termina: libera el guard
  const [procesoConcluido, setProcesoConcluido] = useState(false);

  // Guard de navegación: activo solo si hay proceso en curso Y no ha concluido
  const guardActivo = (robotState === 'loading' || robotState === 'success') && !procesoConcluido;
  const { handleBeforeNavigate } = useImportacionGuard({
    isExecuting: guardActivo,
    ejecucionId: ejecucionInfo?.id,
    tipo: tipo,
    onCancelCallback: () => {
      setRobotState("idle");
      setMensaje("Operación cancelada al cambiar de vista.");
      setProgress(0);
      setShowModal(false);
      setProcesoConcluido(true);
    }
  });

  // Timer para progreso simulado
  useEffect(() => {
    let intervalId;
    if (robotState === "loading") {
      setProgress(0);
      // Avanzar hasta 90% en ~60 segundos. 60s = 60000ms. 60000ms / 90 pasos = ~666ms por paso
      intervalId = setInterval(() => {
        setProgress((prev) => {
          if (prev < 90) return prev + 1;
          return prev;
        });
      }, 666);
    } else if (robotState === "success") {
      setProgress(100);
    } else if (robotState === "idle") {
      setProgress(0);
    }
    
    return () => clearInterval(intervalId);
  }, [robotState]);

  const userName = user?.nombre || "Usuario";
  const rol = roles[0] || (loadingRoles ? "Cargando rol..." : "Sin rol");

  const [alertInfo, setAlertInfo] = useState({ isOpen: false, type: '', title: '', message: '' });
  const showAlert = (type, message, title = '') => setAlertInfo({ isOpen: true, type, message, title });
  const closeAlert = () => setAlertInfo((prev) => ({ ...prev, isOpen: false }));

  const oppositeTipo = tipo === 'estudiante' ? 'docente' : 'estudiante';
  const oppositeLabel = tipo === 'estudiante' ? 'Docentes' : 'Estudiantes';
  const oppositeIcon = tipo === 'estudiante' ? mdiAccountTie : mdiAccountSchool;

  const menuItems = [
    { label: "Inicio", path: "/home", icon: <Icon icon={mdiHome} size={1.2} /> },
    { label: "Conexión", path: `/importacion/${tipo}`, icon: <Icon icon={mdiRobot} size={1.5} /> },
    { label: "Carga Masiva", path: `/importacion/masiva/${tipo}`, icon: <Icon icon={mdiServer} size={1.5} /> },
    { label: "Carga Individual", path: `/importacion/individual/${tipo}`, icon: <Icon icon={mdiCardAccountDetails} size={1.5} /> },
    { label: oppositeLabel, path: `/importacion/${oppositeTipo}`, icon: <Icon icon={oppositeIcon} size={1.5} /> }
  ];

  // 1. Cargar credenciales al iniciar
  useEffect(() => {
    // Forzar el fondo blanco en este componente
    const moduleContent = document.querySelector('.module-content');
    if (moduleContent) {
      moduleContent.style.backgroundColor = '#FFFFFF';
      moduleContent.style.margin = '0';
      moduleContent.style.borderRadius = '0';
    }

    cargarCredenciales();

    return () => {
      if (moduleContent) {
        moduleContent.style.backgroundColor = '';
        moduleContent.style.margin = '';
        moduleContent.style.borderRadius = '';
      }
    };
  }, []);

  const cargarCredenciales = async () => {
    try {
      const res = await obtenerCredencialesRequest();
      setUrl(res.data.url);
      setUsuario(res.data.nombre_usuario);
      setPassword(""); // Se exceptúa la contraseña por seguridad
    } catch (error) {
      // Credenciales no existen o no cargadas
    }
  };

  // 2. Acción de Conectar
  const handleConectar = async (e) => {
    e.preventDefault();
    
    // Primero, guardar las credenciales (por si las cambiaron)
    setRobotState("loading");
    setMensaje("Robot conectando y verificando credenciales...");

    try {
      await actualizarCredencialesRequest({
        url,
        nombre_usuario: usuario,
        password
      });

      // Segundo, encender el robot
      setMensaje(`Robot trabajando... descargando información de ${tipo}s`);
      
      let resScraping;
      if (tipo === "estudiante") {
        resScraping = await iniciarScrapingEstudiantesRequest();
      } else {
        resScraping = await iniciarScrapingDocentesRequest();
      }

      if (resScraping.data.estado === "error") {
        setRobotState("error");
        setMensaje("Algo falló, revisa credenciales y conexión a internet");
      } else if (resScraping.data.estado === "completado_con_errores") {
        setRobotState("error");
        setMensaje("Scraping finalizado, pero hubo algunos errores de extracción.");
      } else {
        setRobotState("success");
        setMensaje("Scraping finalizado. Esperando validación...");
        setEjecucionInfo({
          id: resScraping.data.ejecucion_id,
          registros: tipo === 'estudiante' ? resScraping.data.registros_estudiantes : resScraping.data.registros_docentes
        });
        setShowModal(true);
      }

    } catch (error) {
      showAlert("error", "Ocurrió un error al contactar al servidor.");
      setRobotState("error");
      setMensaje("Algo falló, revisa credenciales y conexión a internet");
    }
  };

  const handleAceptar = async () => {
    setShowModal(false);
    setRobotState("loading");
    setMensaje("Sincronizando datos en el sistema...");
    try {
      let resSync;
      if (tipo === "estudiante") {
         resSync = await sincronizarEstudiantesRequest(ejecucionInfo.id);
      } else {
         resSync = await sincronizarDocentesRequest(ejecucionInfo.id);
      }
      setRobotState("success");
      setMensaje(`¡Sincronización exitosa!\nInsertados: ${resSync.data.insertados} | Actualizados: ${resSync.data.actualizados} | Rechazados: ${resSync.data.rechazados}`);
      setProcesoConcluido(true); // Liberar guard: proceso terminó correctamente
    } catch (e) {
      setRobotState("error");
      setMensaje("Error al sincronizar los datos.");
      setProcesoConcluido(true); // Liberar guard incluso en error: no hay staging pendiente
    }
  };

  const handleCancelar = async () => {
    const confirmar = window.confirm("Estás en medio de un proceso, si cambias de vista o cancelas, los datos serán eliminados. ¿Seguro que deseas cancelar?");
    if (!confirmar) return;

    setShowModal(false);
    setRobotState("loading");
    setMensaje("Cancelando ejecución y limpiando datos temporales...");
    try {
      await cancelarScrapingRequest(ejecucionInfo.id, tipo);
      setRobotState("idle");
      setMensaje("Operación cancelada. Datos temporales eliminados exitosamente.");
      setProgress(0);
      setProcesoConcluido(true); // Liberar guard: cancelación completada
    } catch (e) {
      setRobotState("error");
      setMensaje("Error al cancelar la operación.");
      setProcesoConcluido(true); // Liberar guard de todas formas
    }
  };

  // Selector dinámico del video
  const getVideoSource = () => {
    switch (robotState) {
      case "loading": return videoTrabajando;
      case "success": return videoTerminado;
      case "error": return videoError;
      default: return videoIdle;
    }
  };

  return (
    <div>
      <Header title="SISTEMA DE PAZ Y SALVO - NEW CAMBRIGDE SCHOOL" />
      <ModuleLayout
        sidebar={
          <Sidebar
            menuItems={menuItems}
            selectedMenu="Conexión"
            user={{ nombre: userName, rol }}
            loadingRoles={loadingRoles}
            logout={logout}
            onBeforeNavigate={handleBeforeNavigate}
          />
        }
      >
        <div className={styles.container}>
          
          {/* CABECERA: Formulario + Bandera */}
          <div className={styles.topSection}>
            <form className={styles.formSection} onSubmit={handleConectar} autoComplete="off">
              <div className={styles.inputGroup}>
                <label>Url</label>
                <input 
                  type="text" 
                  value={url} 
                  onChange={(e) => setUrl(e.target.value)} 
                  required 
                  autoComplete="off"
                />
              </div>
              
              <div className={styles.inputGroup}>
                <label>Usuario</label>
                <input 
                  type="text" 
                  value={usuario} 
                  onChange={(e) => setUsuario(e.target.value)} 
                  required 
                  autoComplete="off"
                />
              </div>

              <div className={styles.inputGroup}>
                <label>Contraseña</label>
                <input 
                  type="password" 
                  value={password} 
                  onChange={(e) => setPassword(e.target.value)} 
                  required 
                  autoComplete="new-password"
                />
                <button type="submit" className={styles.connectBtn} disabled={robotState === "loading"}>
                  {robotState === "loading" ? "Conectando..." : "Conectar"}
                </button>
              </div>
            </form>

            <div className={styles.badgeSection}>
              <div 
                className={styles.badgeFlag}
                onClick={() => navigate("/importacion")}
                title="Volver a Robot"
              >
                {tituloBandera}
              </div>
            </div>
          </div>

          <hr className={styles.divider} />

          {/* ÁREA DEL ROBOT */}
          <div className={styles.robotArea}>
            <div className={styles.progressContainerWrapper}>
              {robotState === "idle" && (
                <p className={styles.robotMessage}>{mensaje}</p>
              )}
              {robotState !== "idle" && (
                <div className={styles.progressLayout}>
                  <p className={styles.robotMessage}>
                    {robotState === "loading" ? (
                      <>El robot está haciendo su trabajo,<br />ten un poco de paciencia...</>
                    ) : mensaje}
                  </p>
                  <div className={styles.progressBarWrapper}>
                    <div className={styles.progressBarBackground}>
                      <div 
                        className={styles.progressBarFill} 
                        style={{ width: `${progress}%`, backgroundColor: robotState === "error" ? "#e74c3c" : "#F6C83B" }}
                      ></div>
                    </div>
                    <span className={styles.progressText}>{progress}%</span>
                  </div>
                </div>
              )}
            </div>

            <div className={styles.videoWrapper}>
              <video key={robotState} autoPlay loop muted playsInline className={styles.robotVideo}>
                <source src={getVideoSource()} type="video/mp4" />
                Tu navegador no soporta videos HTML5.
              </video>
            </div>
          </div>

          {/* MODAL EMERGENTE COMPONENTE GLOBAL */}
          <Modal
            isOpen={showModal}
            title="CONEXIÓN DEL ROBOT"
            onCancel={handleCancelar}
            onAccept={handleAceptar}
            fields={[
              {
                key: "info",
                type: "label",
                label: (
                  <div style={{ textAlign: "center" }}>
                    <p>Información que se cargó.</p>
                    <p>ID de Ejecución: <strong>{ejecucionInfo?.id}</strong></p>
                    <p>Registros listos: <strong>{ejecucionInfo?.registros}</strong></p>
                    <p style={{ marginTop: "20px" }}>¿Desea validar e insertar los datos?</p>
                  </div>
                )
              }
            ]}
          />

        </div>
      </ModuleLayout>
      <Alert {...alertInfo} onClose={closeAlert} />
    </div>
  );
}

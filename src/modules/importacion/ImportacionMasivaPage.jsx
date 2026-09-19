import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import * as XLSX from "xlsx";
import axiosClient from "../../api/axiosClient";

import ModuleLayout from "../../components/layout/ModuleLayout";
import Sidebar from "../../components/layout/Sidebar";
import Header from "../../components/layout/header";
import { useAuth } from "../../api/AuthContext";

import {
  sincronizarEstudiantesRequest,
  sincronizarDocentesRequest,
  cancelarScrapingRequest
} from "../../api/importacionService";

import { useImportacionGuard } from "./hooks/useImportacionGuard";
import styles from "./ImportacionMasivaPage.module.css";

import Icon from "../../components/common/Icon";
import { mdiHome, mdiRobot, mdiServer, mdiCardAccountDetails, mdiDownload, mdiCloudUpload, mdiAccountTie, mdiAccountSchool } from '@mdi/js';
import Alert from "../../components/shared/Alert";
import Modal from "../../components/shared/Modal";

export default function ImportacionMasivaPage() {
  const navigate = useNavigate();
  const { user, roles, loadingRoles, logout } = useAuth();
  const { tipo } = useParams(); // 'estudiante' o 'docente'
  
  const [fileData, setFileData] = useState([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef(null);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const recordsPerPage = 5;

  // Modal States
  const [showModal, setShowModal] = useState(false);
  const [ejecucionInfo, setEjecucionInfo] = useState(null);
  const [modalMessage, setModalMessage] = useState("");
  const [syncDone, setSyncDone] = useState(false);
  // true cuando la sincronización o cancelación termina: libera el guard
  const [procesoConcluido, setProcesoConcluido] = useState(false);

  // Guard de navegación: activo si hay datos cargados en memoria y no ha concluido la sincronización
  const guardActivo = fileData.length > 0 && !procesoConcluido;
  const { handleBeforeNavigate } = useImportacionGuard({
    isExecuting: guardActivo,
    ejecucionId: ejecucionInfo?.id,
    tipo: tipo,
    onCancelCallback: () => {
      setIsUploading(false);
      setShowModal(false);
      setFileData([]);
      setProcesoConcluido(true);
    }
  });

  const tituloBandera = tipo ? tipo.toUpperCase() : "MASIVA";
  const isEstudiante = tipo === "estudiante";

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

  useEffect(() => {
    const moduleContent = document.querySelector('.module-content');
    if (moduleContent) {
      moduleContent.style.backgroundColor = '#FFFFFF';
      moduleContent.style.margin = '0';
      moduleContent.style.borderRadius = '0';
    }
    return () => {
      if (moduleContent) {
        moduleContent.style.backgroundColor = '';
        moduleContent.style.margin = '';
        moduleContent.style.borderRadius = '';
      }
    };
  }, []);

  const handleDownloadTemplate = () => {
    const wb = XLSX.utils.book_new();
    
    const headers = isEstudiante 
      ? ["Código", "Nombre Completo", "Grado", "Grupo", "Contacto del Padre"]
      : ["Código", "Nombre Completo", "Grado Titular", "Grupo Titular"];
      
    const ws = XLSX.utils.aoa_to_sheet([headers]);
    
    // Dimensionamiento perfecto de columnas para evitar cortes
    if (isEstudiante) {
      ws['!cols'] = [
        { wch: 15 }, // Código
        { wch: 40 }, // Nombre Completo
        { wch: 10 }, // Grado
        { wch: 10 }, // Grupo
        { wch: 30 }  // Contacto del Padre
      ];
    } else {
      ws['!cols'] = [
        { wch: 15 }, // Código
        { wch: 40 }, // Nombre Completo
        { wch: 15 }, // Grado Titular
        { wch: 15 }  // Grupo Titular
      ];
    }
    
    XLSX.utils.book_append_sheet(wb, ws, "Plantilla");
    XLSX.writeFile(wb, `Plantilla_${tituloBandera}.xlsx`);
  };

  // --- DRAG AND DROP ---
  const onDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };
  const onDragLeave = () => {
    setIsDragging(false);
  };
  const onDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFile(e.dataTransfer.files[0]);
    }
  };
  const onFileInputChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFile(e.target.files[0]);
    }
  };

  const handleFile = (file) => {
    const reader = new FileReader();
    reader.onload = (evt) => {
      const bstr = evt.target.result;
      const wb = XLSX.read(bstr, { type: "binary" });
      const wsname = wb.SheetNames[0];
      const ws = wb.Sheets[wsname];
      const data = XLSX.utils.sheet_to_json(ws, { header: 1 });
      
      // Filtrar filas vacías
      const filteredData = data.filter(row => row.length > 0 && row.some(cell => cell !== null && cell !== ""));
      
      // Remover cabeceras y mapear a un arreglo de objetos según el tipo
      const rows = filteredData.slice(1).map(row => {
        if (isEstudiante) {
          return {
            documento: row[0]?.toString(),
            nombre: row[1]?.toString(),
            grado: row[2]?.toString(),
            curso: row[3]?.toString(),
            observaciones: row[4]?.toString() // Contacto del Padre
          };
        } else {
          return {
            documento: row[0]?.toString(),
            nombre: row[1]?.toString(),
            grado_titular: row[2]?.toString(),
            curso_titular: row[3]?.toString()
          };
        }
      }).filter(item => item.documento && item.nombre); // Solo items con documento y nombre

      setFileData(rows.slice(0, 500)); // Máximo 500
      setCurrentPage(1); // Reset pagination
    };
    reader.readAsBinaryString(file);
  };

  // --- UPLOAD TO BACKEND ---
  const handleUpload = async () => {
    if (fileData.length === 0) return;
    
    setIsUploading(true);
    try {
      const response = await axiosClient.post("/api/importacion/carga-masiva", {
        tipo: tipo,
        datos: fileData
      });
      
      setEjecucionInfo({
        id: response.data.ejecucion_id,
        registros: response.data.insertados
      });
      setModalMessage("");
      setSyncDone(false);
      setShowModal(true);
      
    } catch (error) {
      showAlert("error", "Error de conexión con el servidor.");
    } finally {
      setIsUploading(false);
    }
  };

  // --- PAGINATION LOGIC ---
  const indexOfLastRecord = currentPage * recordsPerPage;
  const indexOfFirstRecord = indexOfLastRecord - recordsPerPage;
  const currentRecords = fileData.slice(indexOfFirstRecord, indexOfLastRecord);
  const totalPages = Math.ceil(fileData.length / recordsPerPage);

  const handleNextPage = () => {
    if (currentPage < totalPages) setCurrentPage(currentPage + 1);
  };

  const handlePrevPage = () => {
    if (currentPage > 1) setCurrentPage(currentPage - 1);
  };

  // --- MODAL ACTIONS ---
  const handleAceptar = async () => {
    setShowModal(false);
    setIsUploading(true);
    try {
      let resSync;
      if (tipo === "estudiante") {
         resSync = await sincronizarEstudiantesRequest(ejecucionInfo.id);
      } else {
         resSync = await sincronizarDocentesRequest(ejecucionInfo.id);
      }
      setSyncDone(true);
      setProcesoConcluido(true); // Liberar guard: sincronización completada
      showAlert("success", `¡Sincronización exitosa!\nInsertados: ${resSync.data.insertados} | Actualizados: ${resSync.data.actualizados} | Rechazados: ${resSync.data.rechazados}`, "Carga Masiva Completada");
      setFileData([]);
    } catch (e) {
      showAlert("error", "Error al sincronizar los datos.");
      setProcesoConcluido(true); // Liberar guard incluso en error
    } finally {
      setIsUploading(false);
    }
  };

  const handleCancelar = () => {
    // Solo oculta el modal, conservando los datos cargados en la tabla
    setShowModal(false);
  };

  return (
    <div>
      <Header title="SISTEMA DE PAZ Y SALVO - NEW CAMBRIGDE SCHOOL" />
      <ModuleLayout
        sidebar={
          <Sidebar
            menuItems={menuItems}
            selectedMenu="Carga Masiva"
            user={{ nombre: userName, rol }}
            loadingRoles={loadingRoles}
            logout={logout}
            onBeforeNavigate={handleBeforeNavigate}
          />
        }
      >
        <div className={styles.container}>
          
          <div className={styles.topSection}>
            <div className={styles.titleSection}>
              <h3>CARGA MASIVA</h3>
              <p>Carga {tipo}s desde un archivo .xlsx</p>
              <button className={styles.downloadBtn} onClick={handleDownloadTemplate}>
                <Icon icon={mdiDownload} size={1} /> Descargar plantilla
              </button>
            </div>

            <div 
              className={`${styles.dropzoneArea} ${isDragging ? styles.dragActive : ""}`}
              onDragOver={onDragOver}
              onDragLeave={onDragLeave}
              onDrop={onDrop}
              onClick={() => fileInputRef.current.click()}
            >
              <Icon icon={mdiCloudUpload} size={3} className={styles.uploadIcon} />
              <p className={styles.dropzoneText}>Arrastra tu archivo aquí o <u>seleccionar</u></p>
              <p className={styles.dropzoneSubText}>.xlsx máximo 500 registros</p>
              <input 
                type="file" 
                accept=".xlsx, .xls" 
                ref={fileInputRef} 
                style={{ display: "none" }} 
                onChange={onFileInputChange} 
              />
            </div>

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

          <div className={styles.actionSection}>
            <button 
              className={styles.loadBtn} 
              disabled={fileData.length === 0 || isUploading}
              onClick={handleUpload}
            >
              {isUploading ? "Cargando..." : "Cargar"}
            </button>
          </div>

          <div className={styles.tableSection}>
            <h4 className={styles.tableTitle}>FORMATO DEL ARCHIVO (HORIZONTAL)</h4>
            <table className={styles.previewTable}>
              <thead>
                <tr>
                  <th>Código</th>
                  <th>Nombre Completo</th>
                  <th>Grado</th>
                  <th>Grupo</th>
                  {isEstudiante && <th>Contacto del Padre</th>}
                </tr>
              </thead>
              <tbody>
                {fileData.length > 0 ? (
                  currentRecords.map((row, idx) => (
                    <tr key={idx}>
                      <td>{row.documento}</td>
                      <td>{row.nombre}</td>
                      <td>{isEstudiante ? row.grado : row.grado_titular}</td>
                      <td>{isEstudiante ? row.curso : row.curso_titular}</td>
                      {isEstudiante && <td>{row.observaciones}</td>}
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td></td>
                    <td></td>
                    <td></td>
                    <td></td>
                    {isEstudiante && <td></td>}
                  </tr>
                )}
              </tbody>
            </table>

            <div className={styles.paginationSection}>
              <button 
                onClick={handlePrevPage} 
                disabled={currentPage === 1 || fileData.length === 0}
                className={styles.pageBtn}
              >
                Anterior
              </button>
              {fileData.length > 0 && (
                <span className={styles.pageInfo}>
                  Página {currentPage} de {totalPages || 1} ({fileData.length} registros totales)
                </span>
              )}
              <button 
                onClick={handleNextPage} 
                disabled={currentPage === totalPages || totalPages === 0 || fileData.length === 0}
                className={styles.pageBtn}
              >
                Siguiente
              </button>
            </div>
          </div>

          {/* MODAL EMERGENTE COMPONENTE GLOBAL */}
          <Modal
            isOpen={showModal}
            title="CARGA MASIVA"
            onCancel={handleCancelar}
            onAccept={handleAceptar}
            fields={[
              {
                key: "info",
                type: "label",
                label: (
                  <div style={{ textAlign: "center" }}>
                    <p>Información que se cargó.</p>
                    <p>Registros validados: <strong>{ejecucionInfo?.registros}</strong></p>
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

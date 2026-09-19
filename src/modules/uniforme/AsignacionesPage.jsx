import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import Header from "../../components/layout/header";
import ModuleLayout from "../../components/layout/ModuleLayout";
import Sidebar from "../../components/layout/Sidebar";
import SearchBar from "../../components/shared/searchBar";
import ActionButtons from "../../components/shared/ActionButtons";
import DataTable from "../../components/shared/DataTable";
import Modal from "../../components/shared/Modal";
import Alert from "../../components/shared/Alert";
import { Icon } from "@mdi/react";
import {
  mdiHome,
  mdiHanger,
  mdiTshirtCrew
} from "@mdi/js";
import {
  getAsignacionesRequest,
  deletePrestamoRequest,
  devolverPrestamoRequest,
  getObjetosDisponiblesRequest,
  registrarPrestamoRequest
} from "../../api/uniformesService";
import { useAuth } from "../../api/AuthContext";
import { allaniosacademicosRequest } from "../../api/endpoints";


// ─── Utilidad ────────────────────────────────────────────────────────────────
const capitalizar = (texto) =>
  texto
    ? texto.charAt(0).toUpperCase() + texto.slice(1).toLowerCase()
    : "—";


const formatearFecha = (fecha) => {
  if (!fecha) return "";

  return new Intl.DateTimeFormat("es-CO", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric"
  }).format(new Date(fecha));
};

// ─── Columnas de la tabla (definidas fuera del componente: una sola instancia) ─
const COLUMNS = [
  { key: "codigo", label: "Código",
    render: (value) => <span style={{ fontFamily: 'Roboto, sans-serif', fontWeight: 400 }}>{value}</span>
   },
  { key: "nombre_completo", label: "Nombre completo" },
  { key: "grado", label: "Grado" },
  { key: "grupo", label: "Grupo" },
  {
    key: "prenda",
    label: "Prenda",
    render: (val) => capitalizar(val)
  },
  {
    key: "fecha_entrega",
    label: "Fecha Entrega",
    render: (_, row) => {
      const fecha = row.fecha_entrega ? formatearFecha(row.fecha_entrega) : "—";
      return <span style={{ fontFamily: 'Roboto, sans-serif', fontWeight: 400 }}>{fecha}</span>;
    }
  },
  {
    key: "estado",
    label: "Estado",
    render: (val) => {
      const estado = val?.toLowerCase();
      let clase = "uniforme-badge--default";
      if (estado === "prestado")     clase = "badge--warn";
      else if (estado === "bueno")   clase = "badge--ok";
      else if (estado === "regular") clase = "badge--warn";
      else if (estado === "malo")    clase = "badge--no";
      else if (estado === "sin asignar") clase = "badge--no";
      return <span className={clase}>{capitalizar(val)}</span>;
    }
  }
];

export default function AsignacionesPage() {
  const { user, roles, loadingRoles } = useAuth();
  const navigate = useNavigate();

  // ── Estados de la interfaz ──────────────────────────────────────────────────
  const [selectedRow, setSelectedRow]   = useState(null);
  const [asignaciones, setAsignaciones] = useState([]);
  const [loading, setLoading]           = useState(true);
  const [periodos, setPeriodos]         = useState([]);
  const [periodosCargados, setPeriodosCargados] = useState(false);

  // ── Modales ─────────────────────────────────────────────────────────────────
  const [openModal, setOpenModal]       = useState(false);
  const [openDevolver, setOpenDevolver] = useState(false);
  const [openEliminar, setOpenEliminar] = useState(false);

  // ── Estado Alerta ───────────────────────────────────────────────────────────
  const [alerta, setAlerta] = useState({
    isOpen: false,
    type: "info",
    title: "",
    message: ""
  });

  // ── Función Alerta ──────────────────────────────────────────────────────────
  const mostrarAlerta = (
    type,
    message,
    title = ""
  ) => {
    setAlerta({
      isOpen: true,
      type,
      title,
      message
    });
  };

  // ── Estado interno del modal AsignarPrenda ───────────────────────────────────
  const [prendas, setPrendas]           = useState([]);
  const [loadingModal, setLoadingModal] = useState(false);
  const [formAsignar, setFormAsignar]   = useState({
    id_objeto: "",
    talla: "",
    fecha_prestamo: "",
    estado: "",
    observacion: ""
  });

  const fechaVisual = formatearFecha(new Date());

  // Cargar prendas disponibles y resetear formulario al abrir el modal
  useEffect(() => {
    const cargarPrendas = async () => {
      try {
        const response = await getObjetosDisponiblesRequest();
        setPrendas(response.data);
      } catch (error) {
        console.error("Error cargando prendas:", error);
      }
    };

    if (openModal) {
      cargarPrendas();
      setFormAsignar({
        id_objeto: "seleccionar",
        talla: "",
        fecha_prestamo: fechaVisual,
        estado: "seleccionar",
        observacion: ""
      });
    }
  }, [openModal, fechaVisual]);

  const opcionesPrendas = useMemo(
    () => prendas.map((item) => ({ value: item.id_objeto, label: item.nombre })),
    [prendas]
  );

  const prendaSeleccionada = prendas.find(
    (p) => p.id_objeto === Number(formAsignar.id_objeto)
  );

  const handleAsignarSubmit = async () => {
    if (loadingModal) return;

    if (
      !formAsignar.id_objeto ||
      formAsignar.id_objeto === "seleccionar"
    ) {
      mostrarAlerta("error", "Seleccione una prenda");
      return;
    }
    if (prendaSeleccionada?.tipo === "vestimenta" && !formAsignar.talla) {
      mostrarAlerta("error", "Seleccione una talla");
      return;
    }
    if (!selectedRow?.id_estudiante) {
      mostrarAlerta("error", "Debe seleccionar un estudiante");
      return;
    }
    if (
      !formAsignar.estado ||
      formAsignar.estado === "seleccionar"
    ) {
      mostrarAlerta(
        "error",
        "Seleccione el estado de la prenda"
      );
      return;
    }

    if (prendaSeleccionada?.tipo === "vestimenta" && !formAsignar.talla) {
      mostrarAlerta("error", "Seleccione una talla");
      return;
    }
    const data = {
      id_objeto: parseInt(formAsignar.id_objeto),
      id_estudiante: selectedRow.id_estudiante,
      talla: prendaSeleccionada?.tipo === "vestimenta" ? formAsignar.talla : null,
      estado: formAsignar.estado,
      cantidad_prestada: 1
    };

    try {
      setLoadingModal(true);
      await registrarPrestamoRequest(data);
      mostrarAlerta(
        "success",
        "La prenda fue asignada correctamente."
      );
      await cargarAsignaciones();
      setOpenModal(false);
    } catch (error) {
      console.error("ERROR BACKEND:", error.response?.data);
      mostrarAlerta(
        "error",
        error.response?.data?.detail || "Error al registrar préstamo"
      );
    } finally {
      setLoadingModal(false);
    }
  };

  // ── Formulario devolución ────────────────────────────────────────────────────
  const [formDevolucion, setFormDevolucion] = useState({
    prenda: "",
    talla: "",
    fecha_entrega: "",
    fecha_devolucion: "",
    estado_entrega: "",
    estado_devolucion: "seleccionar",
    observacion: ""
  });

  // ── Filtros ──────────────────────────────────────────────────────────────────
  const [filtros, setFiltros] = useState({
    codigo: "", nombre: "", grado: "", grupo: "", anio: ""
  });
  const [filtrosAplicados, setFiltrosAplicados] = useState({
    codigo: "", nombre: "", grado: "", grupo: "", anio: ""
  });

  const rol = roles[0] || (loadingRoles ? "Cargando rol..." : "Sin rol");

  // ── Carga de periodos ────────────────────────────────────────────────────────
  const cargarPeriodos = async () => {
    try {
      const res = await allaniosacademicosRequest();
      setPeriodos(res.data);

      const periodoActivo = res.data.find((periodo) => periodo.activo);
      const anioActivo    = periodoActivo?.nombre || "";

      setFiltros((prev)          => ({ ...prev, anio: anioActivo }));
      setFiltrosAplicados((prev) => ({ ...prev, anio: anioActivo }));
    } catch (error) {
      console.error("Error cargando periodos", error);
    } finally {
      setPeriodosCargados(true);
    }
  };

  // ── Carga de asignaciones (sin roles, solo datos) ────────────────────────────
  const cargarAsignaciones = async () => {
    try {
      const response = await getAsignacionesRequest();
      setAsignaciones(response.data);
    } catch (error) {
      console.error("Error cargando asignaciones", error);
    }
  };

  // ── Carga inicial unificada ──────────────────────────────────────────────────
  useEffect(() => {
    const cargarDatosIniciales = async () => {
      try {
        setLoading(true);
        await cargarAsignaciones();
      } catch (error) {
        console.error("Error cargando datos del módulo:", error);
      } finally {
        setLoading(false);
      }
    };
    cargarDatosIniciales();
  }, []);

  useEffect(() => {
    cargarPeriodos();
  }, []);

  // ── Eliminar ───────────────────────────
  const eliminarAsignacion = async (id) => {
    try {
      await deletePrestamoRequest(id);
      await cargarAsignaciones();
      setSelectedRow(null);
    } catch (error) {
      console.error("Error deleting loan assignment", error);
      throw error;
    }
  };

  const confirmarEliminarAsignacion = async () => {
    if (!selectedRow) return;
    try {
      await eliminarAsignacion(selectedRow.id_prestamo);
      setOpenEliminar(false);
    } catch (error) {
      console.error("Error al confirmar la eliminación de la asignación:", error);
      mostrarAlerta(
        "error",
        "No se pudo eliminar la asignación. Intente nuevamente."
      );
    }
  };

  // ── Devolver ─────────────────────────────────────────────────────────────────
  const devolverPrenda = async () => {
    if (!selectedRow) {
      mostrarAlerta("error", "Seleccione una asignación");
      return;
    }
    if (
      !formDevolucion.estado_devolucion ||
      formDevolucion.estado_devolucion === "seleccionar"
    ) {
      mostrarAlerta("error", "Seleccione el estado de devolución");
      return;
    }
    if (
      formDevolucion.estado_devolucion === "Malo" &&
      !formDevolucion.observacion.trim()
    ) {
      mostrarAlerta("error", "Debe ingresar una observación cuando la prenda se devuelve en mal estado");
      return;
    }

    try {
      await devolverPrestamoRequest(selectedRow.id_prestamo, {
        estado_devolucion: formDevolucion.estado_devolucion,
        observacion: formDevolucion.observacion
      });

      await cargarAsignaciones();
      setOpenDevolver(false);
      setFormDevolucion({
        prenda: "", talla: "", fecha_entrega: "", fecha_devolucion: "",
        estado_entrega: "", estado_devolucion: "", observacion: ""
      });
      mostrarAlerta(
        "success",
        "La devolución fue registrada correctamente."
      );
    } catch (error) {
      console.error(error);
      mostrarAlerta(
        "error",
        error?.response?.data?.detail || "Error al devolver la prenda."
      );
    }
  };

  // ── Opciones de filtros ──────────────────────────────────────────────────────
  const opcionesGrados = useMemo(() =>
    asignaciones
      .map((item) => item.grado?.toString())
      .filter((value, index, self) => value && self.indexOf(value) === index)
      .sort((a, b) => Number(a) - Number(b)),
    [asignaciones]
  );

  const opcionesGrupos = useMemo(() => {
    if (filtros.grado === "") return [];
    return asignaciones
      .filter((item) => item.grado?.toString() === filtros.grado)
      .map((item) => item.grupo?.toString())
      .filter((value, index, self) => value && self.indexOf(value) === index)
      .sort();
  }, [asignaciones, filtros.grado]);

  const opcionesAnios = useMemo(() =>
    periodos.map((p) => p.nombre).filter(Boolean),
    [periodos]
  );

  // ── Filtrado ─────────────────────────────────────────────────────────────────
  const asignacionesFiltradas = useMemo(() =>
    asignaciones.filter((item) => {
      const coincideCodigo  = filtrosAplicados.codigo === "" ||
        item.codigo?.toString().includes(filtrosAplicados.codigo);
      const coincideNombre  = filtrosAplicados.nombre === "" ||
        item.nombre_completo?.toLowerCase().includes(filtrosAplicados.nombre.toLowerCase());
      const coincideGrado   = filtrosAplicados.grado === "" ||
        item.grado?.toString() === filtrosAplicados.grado;
      const coincideGrupo   = filtrosAplicados.grupo === "" ||
        item.grupo?.toString() === filtrosAplicados.grupo;
      const coincideAnio    = filtrosAplicados.anio === "" ||
        item.anio?.toString() === filtrosAplicados.anio;
      return coincideCodigo && coincideNombre && coincideGrado && coincideGrupo && coincideAnio;
    }),
    [asignaciones, filtrosAplicados]
  );

  const modulos = [
    {
      label: "Inicio",
      icon: <Icon path={mdiHome} size={1} />,
      path: "/home"
    },
    {
      label: "Asignación Uniformes",
      icon: <Icon path={mdiTshirtCrew} size={1} />,
      path: "/uniformes/asignaciones",
      roles: ["admin", "titular", "uniformes"]
    },
    {
      label: "Inventario Uniformes",
      icon: <Icon path={mdiHanger} size={1} />,
      path: "/uniformes/inventario",
      roles: ["admin", "titular", "uniformes"]
    }
  ];

  const sidebarMenuItems = modulos.filter(modulo =>
    !modulo.roles ||
    roles.some(rol => modulo.roles.includes(rol))
  );

  const tieneAccesoModulo = roles.some(
    rol => ["admin", "titular","uniformes"].includes(rol)
  );

  useEffect(() => {
    if (!loadingRoles && !tieneAccesoModulo) {
      navigate("/home");
    }
  }, [loadingRoles, tieneAccesoModulo, navigate]);

  // ── Render ────────────────────────────────────────────────────────────────────
  return (
    <div className="uniformes-page">
      <Header title="SISTEMA DE PAZ Y SALVO - NEW CAMBRIDGE SCHOOL" />

      <ModuleLayout
        sidebar={
          <Sidebar
            user={{ nombre: user?.nombre || "admin", rol }}
            loadingRoles={loadingRoles}
            menuItems={sidebarMenuItems}
            selectedMenu="Asignación Uniformes"
          />
        }
        actions={
            !loadingRoles &&  tieneAccesoModulo ? (
            <ActionButtons
              filaSeleccionada={selectedRow}
              botones={[
                {
                  label: "Asignar Prenda",
                  onClick: () => setOpenModal(true),
                  variante: "primary"
                },
                {
                  label: "Devolver Prenda",
                  disabled: !!selectedRow && !selectedRow.id_prestamo,
                  onClick: () => {
                    if (!selectedRow) {
                      mostrarAlerta("error", "Seleccione una asignación");
                      return;
                    
                    }
                    console.log(selectedRow)
                    setFormDevolucion({
                      prenda: selectedRow.prenda || "",
                      talla: selectedRow.talla || "No aplica",
                      fecha_entrega: selectedRow.fecha_entrega
                        ? formatearFecha(selectedRow.fecha_entrega)
                        : "",
                      fecha_devolucion: formatearFecha(new Date()),
                      estado_entrega: capitalizar(selectedRow.estado_entrega) || "",
                      estado_devolucion: "seleccionar",
                      observacion: ""
                    });
                    setOpenDevolver(true);
                  },
                  variante: "secondary"
                },
                {
                  label: "Eliminar Prenda",
                  disabled: !!selectedRow && !selectedRow.id_prestamo,
                  onClick: () => {
                    if (!selectedRow) {
                      mostrarAlerta("error", "Seleccione una asignación");
                      return;
                    }
                    setOpenEliminar(true);
                  },
                  variante: "primary"
                }
              ]}
            />
          ) : null
        }
      >
        <main className="uniformes-main">
          {periodosCargados && (
            <SearchBar
              initialValues={filtros}
              loading={loading}
              fields={[
                { key: "codigo", label: "Código", type: "text" },
                { key: "nombre", label: "Nombre", type: "text" },
                { key: "grado", label: "Grado", type: "select", options: opcionesGrados },
                { key: "grupo", label: "Grupo", type: "select", options: opcionesGrupos },
                { key: "anio", label: "Año", type: "select", options: opcionesAnios }
              ]}
              onChange={(key, value) => {
                setFiltros((prev) => {
                  const nuevos = { ...prev, [key]: value };
                  if (key === "grado") nuevos.grupo = "";
                  return nuevos;
                });
              }}
              onSearch={(f) => setFiltrosAplicados(f)}
              cleanFilter={{
                codigo: "",
                nombre: "",
                grado: "",
                grupo: "",
                anio: filtros.anio
              }}

            />
          )}
          <div className="table-container">
            <DataTable
              columns={COLUMNS}
              rows={asignacionesFiltradas}
              onRowClick={setSelectedRow}
              pageSize={10}
              emptyText={
                loading
                  ? "Cargando asignaciones..."
                  : "No hay asignaciones registradas"
              }
            />
          </div>
        </main>
      </ModuleLayout>

      {/* ── Modal: Asignar Prenda ─────────────────────────────────────────────── */}
      <Modal
        title="ASIGNAR PRENDA"
        isOpen={openModal}
        onCancel={() => setOpenModal(false)}
        onAccept={handleAsignarSubmit}
        values={formAsignar}
        disabled={loadingModal}
        onChange={(key, value) => {
          if (key === "fecha_prestamo" || loadingModal) return;
          setFormAsignar((prev) => {
            const nuevo = { ...prev, [key]: value };
            if (key === "id_objeto") {
              const objeto = prendas.find((p) => p.id_objeto === Number(value));
              nuevo.talla = 
                objeto?.tipo === "objeto" 
                  ? "No aplica"
                  :  objeto?.talla || ""
            }
            return nuevo;
          });
        }}
        fields={[
          {
            key: "id_objeto",
            label: "Prenda",
            type: "select",
            options: [
              {
                value: "seleccionar",
                label: "Seleccionar"
              },
              ...opcionesPrendas
            ]
            
          },
          {
            key: "talla",
            label: "Talla",
            type: "select",
            options:
              prendaSeleccionada?.tipo === "objeto"
                ? ["No aplica"]
                : prendaSeleccionada?.talla
                  ? [prendaSeleccionada.talla]
                  : []
          },
          { key: "fecha_prestamo", label: "Fecha de Entrega", type: "text" },
          {
            key: "estado",
            label: "Estado de la prenda",
            type: "select",
            options: [
              { value: "seleccionar", label: "Seleccionar" },
              { value: "bueno",   label: "Bueno" },
              { value: "regular", label: "Regular" },
              { value: "malo",    label: "Malo" }
            ]
          },
          { key: "observacion", label: "Observación", type: "text" }
        ]}
      />

      {/* ── Modal: Registrar Devolución ───────────────────────────────────────── */}
      <Modal
        title="REGISTRAR DEVOLUCIÓN"
        isOpen={openDevolver}
        onCancel={() => setOpenDevolver(false)}
        onAccept={devolverPrenda}
        values={formDevolucion}
        onChange={(key, value) =>
          setFormDevolucion((prev) => ({ ...prev, [key]: value }))
        }
        fields={[
          { key: "prenda",           label: "Prenda",               type: "text" },
          { key: "talla",            label: "Talla",                type: "text" },
          { key: "fecha_entrega",    label: "Fecha de Entrega",     type: "text" },
          { key: "fecha_devolucion", label: "Fecha de Devolución",  type: "text" },
          { key: "estado_entrega",   label: "Estado de Entrega",    type: "text" },
          {
            key: "estado_devolucion",
            label: "Estado de Devolución",
            type: "select",
            options: [
              { value: "seleccionar", label: "Seleccionar" },
              { value: "Bueno",   label: "Bueno" },
              { value: "Regular", label: "Regular" },
              { value: "Malo",    label: "Malo" }
            ]
          },
          { key: "observacion", label: "Observación", type: "text" }
        ]}
      />

      {/* ── Modal: Confirmar Eliminación ──────────────────────────────────────── */}
      <Modal
        title="CONFIRMAR ELIMINACIÓN"
        isOpen={openEliminar}
        onCancel={() => setOpenEliminar(false)}
        onAccept={confirmarEliminarAsignacion}
        values={{}}
        onChange={() => {}}
        fields={[
          { 
            key: "mensaje",
            type: "label",
            className: "uniformes-modal-message",
            label: `¿CONFIRMA ELIMINAR LA ASIGNACION?"${(selectedRow?.prenda || "").toUpperCase()}"?
        ESTA ACCIÓN NO SE PUEDE DESHACER.`


          }
        ]}
      />

      <Alert
        {...alerta}
        onClose={() =>
          setAlerta(prev => ({
            ...prev,
            isOpen: false
          }))
        }
      />
    </div>
  );
}
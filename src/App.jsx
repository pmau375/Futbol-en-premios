import { useEffect, useState } from 'react'
import { supabase } from './supabaseClient'

function App() {
  // Estado para gestión de torneos
  const [torneoActual, setTorneoActual] = useState(null)
  const [torneosPublicos, setTorneosPublicos] = useState([])
  const [busquedaCodigo, setBusquedaCodigo] = useState('')
  
  // Pestañas principales y datos
  const [pestanaActiva, setPestanaActiva] = useState('goleadores') // 'goleadores' | 'proximo' | 'partidos' | 'premios' | 'admin'
  const [subAdmin, setSubAdmin] = useState('proximo') // 'proximo' | 'partidos' | 'jugadores' | 'premios' | 'config' | 'respaldos'

  const [jugadores, setJugadores] = useState([])
  const [partidosJugados, setPartidosJugados] = useState([])
  const [proximoPartido, setProximoPartido] = useState(null)
  const [convocadosProximo, setConvocadosProximo] = useState([])
  const [convocadosAdminState, setConvocadosAdminState] = useState({})
  const [premiosOtorgados, setPremiosOtorgados] = useState([])
  const [listaPremios, setListaPremios] = useState([])
  const [cargando, setCargando] = useState(false)

  // Estados Admin
  const [pinAdmin, setPinAdmin] = useState('')
  const [esAdmin, setEsAdmin] = useState(false)

  // Formulario Anunciar Próximo Partido
  const [proximoFechaNumero, setProximoFechaNumero] = useState(1)
  const [proximoEquipoA, setProximoEquipoA] = useState('Los Naranjas')
  const [proximoEquipoB, setProximoEquipoB] = useState('Los Verdes')

  // Formulario Editar Torneo
  const [editTorneoNombre, setEditTorneoNombre] = useState('')
  const [editTorneoCodigo, setEditTorneoCodigo] = useState('')
  const [editTorneoPin, setEditTorneoPin] = useState('')

  // Formulario Jugador (Crear/Editar)
  const [jugadorEditandoId, setJugadorEditandoId] = useState(null)
  const [nuevoNombre, setNuevoNombre] = useState('')
  const [nuevoApodo, setNuevoApodo] = useState('')

  // Formulario Premio Nuevo
  const [nombreNuevoPremio, setNombreNuevoPremio] = useState('')
  const [descNuevoPremio, setDescNuevoPremio] = useState('')

  // Formulario Cargar/Editar Partido Jugado
  const [partidoEditandoId, setPartidoEditandoId] = useState(null)
  const [fechaNumeroPartido, setFechaNumeroPartido] = useState(1)
  const [fechaCalendario, setFechaCalendario] = useState(new Date().toISOString().split('T')[0])
  const [equipoANombre, setEquipoANombre] = useState('Los Naranjas')
  const [equipoAGoles, setEquipoAGoles] = useState(0)
  const [equipoBNombre, setEquipoBNombre] = useState('Los Verdes')
  const [equipoBGoles, setEquipoBGoles] = useState(0)
  const [statsJugadoresPartido, setStatsJugadoresPartido] = useState({})
  const [premiosPartido, setPremiosPartido] = useState({})

  // Formulario Crear Nuevo Torneo
  const [crearNombreTorneo, setCrearNombreTorneo] = useState('')
  const [crearCodigoTorneo, setCrearCodigoTorneo] = useState('')
  const [crearPinTorneo, setCrearPinTorneo] = useState('1234')
  const [crearEsPublico, setCrearEsPublico] = useState(true)

  useEffect(() => {
    cargarTorneosPublicos()
    cargarListaPremios()
  }, [])

  useEffect(() => {
    if (torneoActual) {
      cargarDatosTorneo(torneoActual.id)
      setEditTorneoNombre(torneoActual.nombre || '')
      setEditTorneoCodigo(torneoActual.codigo || '')
      setEditTorneoPin(torneoActual.pin_admin || '1234')
      setEsAdmin(false)
      setPinAdmin('')
    }
  }, [torneoActual])

  async function cargarListaPremios() {
    try {
      const { data } = await supabase.from('premios').select('*').order('id', { ascending: true })
      setListaPremios(data || [])
    } catch (err) {
      console.error('Error cargando lista de premios:', err)
      setListaPremios([])
    }
  }

  async function cargarTorneosPublicos() {
    try {
      const { data } = await supabase.from('torneos').select('*').eq('es_publico', true)
      setTorneosPublicos(data || [])
    } catch (err) {
      console.error('Error cargando torneos públicos:', err)
      setTorneosPublicos([])
    }
  }

  async function cargarDatosTorneo(torneoId) {
    setCargando(true)
    try {
      // 1. Ranking de Jugadores
      const { data: dataJugadores } = await supabase
        .from('ranking_jugadores')
        .select('*')
        .eq('torneo_id', torneoId)

      const jugList = dataJugadores || []
      setJugadores(jugList)

      const inicialStats = {}
      const inicialConvocados = {}
      jugList.forEach(j => {
        const id = j.jugador_id || j.id
        if (id) {
          inicialStats[id] = { lado: 'ninguno', goles: 0, asistencias: 0 }
          inicialConvocados[id] = 'ninguno'
        }
      })
      setStatsJugadoresPartido(inicialStats)

      // 2. Partidos jugados
      const { data: dataJugados } = await supabase
        .from('partidos')
        .select('*')
        .eq('torneo_id', torneoId)
        .eq('jugado', true)
        .order('fecha_numero', { ascending: false })
      setPartidosJugados(dataJugados || [])

      // 3. Próximo Partido
      const { data: dataProximo } = await supabase
        .from('partidos')
        .select('*')
        .eq('torneo_id', torneoId)
        .eq('jugado', false)
        .order('fecha_numero', { ascending: true })
        .limit(1)

      if (dataProximo && dataProximo.length > 0) {
        setProximoPartido(dataProximo[0])
        const { data: dataConvocados } = await supabase
          .from('participaciones')
          .select(`id, lado, jugador_id, jugadores (id, nombre, apodo)`)
          .eq('partido_id', dataProximo[0].id)

        const convocadosList = dataConvocados || []
        setConvocadosProximo(convocadosList)

        convocadosList.forEach(c => {
          const jId = c.jugador_id || c.jugadores?.id
          if (jId) {
            inicialConvocados[jId] = c.lado
          }
        })
        setConvocadosAdminState(inicialConvocados)
      } else {
        setProximoPartido(null)
        setConvocadosProximo([])
        setConvocadosAdminState(inicialConvocados)
      }

      // 4. Premios
      const { data: dataPremios } = await supabase
        .from('premios_otorgados')
        .select(`id, partidos (fecha_numero, torneo_id), jugadores (nombre, apodo), premios (nombre, descripcion)`)
        .filter('partidos.torneo_id', 'eq', torneoId)
      
      if (dataPremios) {
        setPremiosOtorgados(dataPremios.filter(p => p && p.partidos !== null))
      } else {
        setPremiosOtorgados([])
      }
    } catch (err) {
      console.error('Error cargando datos del torneo:', err)
    } finally {
      setCargando(false)
    }
  }

  // --- BUSCAR / CREAR TORNEO ---
  const handleBuscarTorneoPorCodigo = async (e) => {
    e.preventDefault()
    if (!busquedaCodigo.trim()) return

    const { data, error } = await supabase
      .from('torneos')
      .select('*')
      .eq('codigo', busquedaCodigo.trim().toLowerCase())
      .single()

    if (error || !data) {
      alert('No se encontró ningún torneo con ese código.')
    } else {
      setTorneoActual(data)
    }
  }

  const handleCrearNuevoTorneo = async (e) => {
    e.preventDefault()
    const codigoLimpio = crearCodigoTorneo.trim().toLowerCase().replace(/\s+/g, '-')

    const { data, error } = await supabase
      .from('torneos')
      .insert([
        {
          nombre: crearNombreTorneo,
          codigo: codigoLimpio,
          pin_admin: crearPinTorneo || '1234',
          es_publico: crearEsPublico
        }
      ])
      .select()

    if (error) {
      alert('Error creando torneo: ' + error.message)
    } else if (data && data.length > 0) {
      alert('¡Torneo creado exitosamente!')
      setTorneoActual(data[0])
      cargarTorneosPublicos()
    }
  }

  // --- GESTIÓN DE PRÓXIMO PARTIDO Y CONVOCADOS ---
  const handleAnunciarProximoPartido = async (e) => {
    e.preventDefault()
    if (!torneoActual) return

    const { error } = await supabase.from('partidos').insert([
      {
        torneo_id: torneoActual.id,
        fecha_numero: Number(proximoFechaNumero),
        nombre_a: proximoEquipoA,
        nombre_b: proximoEquipoB,
        jugado: false
      }
    ])

    if (error) {
      alert('Error anunciando el partido: ' + error.message)
    } else {
      alert('¡Próximo partido anunciado con éxito!')
      cargarDatosTorneo(torneoActual.id)
      setPestanaActiva('proximo')
    }
  }

  const handleGuardarConvocados = async (e) => {
    e.preventDefault()
    if (!proximoPartido) return

    // 1. Limpiar participaciones actuales del próximo partido
    await supabase
      .from('participaciones')
      .delete()
      .eq('partido_id', proximoPartido.id)

    // 2. Insertar nuevas participaciones asignadas
    const nuevasParticipaciones = []
    Object.keys(convocadosAdminState).forEach(jId => {
      const lado = convocadosAdminState[jId]
      if (lado === 'A' || lado === 'B') {
        nuevasParticipaciones.push({
          partido_id: proximoPartido.id,
          jugador_id: Number(jId),
          lado: lado,
          goles: 0,
          asistencias: 0
        })
      }
    })

    if (nuevasParticipaciones.length > 0) {
      const { error } = await supabase.from('participaciones').insert(nuevasParticipaciones)
      if (error) {
        alert('Error guardando convocados: ' + error.message)
        return
      }
    }

    alert('¡Lista de convocados actualizada!')
    cargarDatosTorneo(torneoActual.id)
    setPestanaActiva('proximo')
  }

  const handleCancelarProximoPartido = async () => {
    if (!proximoPartido) return
    if (!window.confirm('¿Seguro que deseas cancelar la programación de este próximo partido?')) return

    const { error } = await supabase.from('partidos').delete().eq('id', proximoPartido.id)
    if (error) {
      alert('Error al cancelar partido: ' + error.message)
    } else {
      alert('Partido cancelado.')
      cargarDatosTorneo(torneoActual.id)
    }
  }

  const handlePrepararCargaResultado = () => {
    if (!proximoPartido) return
    setSubAdmin('partidos')
    setFechaNumeroPartido(proximoPartido.fecha_numero)
    setEquipoANombre(proximoPartido.nombre_a)
    setEquipoBNombre(proximoPartido.nombre_b)
  }

  // --- GESTIÓN DE TORNEO (EDITAR / BORRAR) ---
  const handleGuardarCambiosTorneo = async (e) => {
    e.preventDefault()
    if (!torneoActual) return

    const codigoLimpio = editTorneoCodigo.trim().toLowerCase().replace(/\s+/g, '-')

    const { error } = await supabase
      .from('torneos')
      .update({
        nombre: editTorneoNombre,
        codigo: codigoLimpio,
        pin_admin: editTorneoPin
      })
      .eq('id', torneoActual.id)

    if (error) {
      alert('Error actualizando torneo: ' + error.message)
    } else {
      alert('¡Ajustes del torneo guardados!')
      setTorneoActual({ ...torneoActual, nombre: editTorneoNombre, codigo: codigoLimpio, pin_admin: editTorneoPin })
      cargarTorneosPublicos()
    }
  }

  const handleCambiarPrivacidad = async () => {
    if (!torneoActual) return
    const nuevaPrivacidad = !torneoActual.es_publico

    const { error } = await supabase
      .from('torneos')
      .update({ es_publico: nuevaPrivacidad })
      .eq('id', torneoActual.id)

    if (error) {
      alert('Error al actualizar la privacidad: ' + error.message)
    } else {
      setTorneoActual({ ...torneoActual, es_publico: nuevaPrivacidad })
      alert(`El torneo ahora es ${nuevaPrivacidad ? 'PÚBLICO' : 'PRIVADO'}`)
      cargarTorneosPublicos()
    }
  }

  const handleEliminarTorneo = async () => {
    if (!torneoActual) return
    if (!window.confirm(`¿Seguro que deseas ELIMINAR permanentemente "${torneoActual.nombre}"?`)) return

    const { error } = await supabase.from('torneos').delete().eq('id', torneoActual.id)
    if (error) {
      alert('Error al eliminar: ' + error.message)
    } else {
      alert('Torneo eliminado.')
      setTorneoActual(null)
      cargarTorneosPublicos()
    }
  }

  // --- GESTIÓN DE JUGADORES (CREAR / EDITAR / ELIMINAR) ---
  const handleGuardarJugador = async (e) => {
    e.preventDefault()
    if (!nuevoNombre.trim() || !torneoActual) return

    if (jugadorEditandoId) {
      const { error } = await supabase
        .from('jugadores')
        .update({ nombre: nuevoNombre.trim(), apodo: nuevoApodo.trim() || null })
        .eq('id', jugadorEditandoId)

      if (error) {
        alert('Error editando jugador: ' + error.message)
      } else {
        alert('¡Jugador actualizado!')
        cancelarEdicionJugador()
        cargarDatosTorneo(torneoActual.id)
      }
    } else {
      const { error } = await supabase.from('jugadores').insert([
        { nombre: nuevoNombre.trim(), apodo: nuevoApodo.trim() || null, torneo_id: torneoActual.id }
      ])

      if (error) {
        alert('Error creando jugador: ' + error.message)
      } else {
        alert('¡Jugador agregado!')
        setNuevoNombre('')
        setNuevoApodo('')
        cargarDatosTorneo(torneoActual.id)
      }
    }
  }

  const seleccionarJugadorParaEditar = (j) => {
    const id = j.jugador_id || j.id
    setJugadorEditandoId(id)
    setNuevoNombre(j.nombre || '')
    setNuevoApodo(j.apodo || '')
  }

  const cancelarEdicionJugador = () => {
    setJugadorEditandoId(null)
    setNuevoNombre('')
    setNuevoApodo('')
  }

  const handleEliminarJugador = async (jugadorId, nombre) => {
    if (!window.confirm(`¿Seguro que deseas eliminar a "${nombre}"? Se borrarán sus estadísticas.`)) return

    const { error } = await supabase.from('jugadores').delete().eq('id', jugadorId)
    if (error) {
      alert('Error eliminando jugador: ' + error.message)
    } else {
      alert('Jugador eliminado.')
      cargarDatosTorneo(torneoActual.id)
    }
  }

  // --- GESTIÓN DE PREMIOS (CREAR / ELIMINAR) ---
  const handleCrearPremio = async (e) => {
    e.preventDefault()
    if (!nombreNuevoPremio.trim()) return

    const { error } = await supabase.from('premios').insert([
      { nombre: nombreNuevoPremio.trim(), descripcion: descNuevoPremio.trim() || null }
    ])

    if (error) {
      alert('Error creando premio: ' + error.message)
    } else {
      alert('¡Premio creado!')
      setNombreNuevoPremio('')
      setDescNuevoPremio('')
      cargarListaPremios()
    }
  }

  const handleEliminarPremio = async (premioId) => {
    if (!window.confirm('¿Deseas eliminar este tipo de premio? Se borrará de los partidos donde se haya otorgado.')) return

    const { error } = await supabase.from('premios').delete().eq('id', premioId)
    if (error) {
      alert('Error al eliminar premio: ' + error.message)
    } else {
      alert('Premio eliminado.')
      cargarListaPremios()
      if (torneoActual) cargarDatosTorneo(torneoActual.id)
    }
  }

  // --- GESTIÓN DE PARTIDOS JUGADOS ---
  const handleGuardarPartidoJugado = async (e) => {
    e.preventDefault()
    if (!torneoActual) return

    if (partidoEditandoId) {
      const { error } = await supabase
        .from('partidos')
        .update({
          fecha_numero: Number(fechaNumeroPartido),
          nombre_a: equipoANombre,
          goles_a: Number(equipoAGoles),
          nombre_b: equipoBNombre,
          goles_b: Number(equipoBGoles),
          jugado_el: fechaCalendario
        })
        .eq('id', partidoEditandoId)

      if (error) {
        alert('Error editando partido: ' + error.message)
      } else {
        alert('¡Partido actualizado!')
        cancelarEdicionPartido()
        cargarDatosTorneo(torneoActual.id)
        setPestanaActiva('partidos')
      }
    } else {
      // Si existía un próximo partido activo con esta misma fecha, eliminarlo o actualizarlo a jugado
      if (proximoPartido && proximoPartido.fecha_numero === Number(fechaNumeroPartido)) {
        await supabase.from('partidos').delete().eq('id', proximoPartido.id)
      }

      const { data: partidoGuardado, error: errorPartido } = await supabase
        .from('partidos')
        .insert([
          {
            torneo_id: torneoActual.id,
            fecha_numero: Number(fechaNumeroPartido),
            nombre_a: equipoANombre,
            goles_a: Number(equipoAGoles),
            nombre_b: equipoBNombre,
            goles_b: Number(equipoBGoles),
            jugado: true,
            jugado_el: fechaCalendario
          }
        ])
        .select()

      if (errorPartido || !partidoGuardado) {
        alert('Error al guardar partido: ' + errorPartido?.message)
        return
      }

      const partidoId = partidoGuardado[0].id

      // Participaciones
      const participacionesAInsertar = []
      Object.keys(statsJugadoresPartido).forEach(jugadorId => {
        const stat = statsJugadoresPartido[jugadorId]
        if (stat && (stat.lado === 'A' || stat.lado === 'B')) {
          participacionesAInsertar.push({
            partido_id: partidoId,
            jugador_id: Number(jugadorId),
            lado: stat.lado,
            goles: Number(stat.goles || 0),
            asistencias: Number(stat.asistencias || 0)
          })
        }
      })
      if (participacionesAInsertar.length > 0) {
        await supabase.from('participaciones').insert(participacionesAInsertar)
      }

      // Premios otorgados
      const premiosAInsertar = []
      Object.keys(premiosPartido).forEach(premioId => {
        const jugadorId = premiosPartido[premioId]
        if (jugadorId) {
          premiosAInsertar.push({
            partido_id: partidoId,
            jugador_id: Number(jugadorId),
            premio_id: Number(premioId)
          })
        }
      })
      if (premiosAInsertar.length > 0) {
        await supabase.from('premios_otorgados').insert(premiosAInsertar)
      }

      alert('¡Partido guardado con éxito!')
      setPremiosPartido({})
      cargarDatosTorneo(torneoActual.id)
      setPestanaActiva('partidos')
    }
  }

  const seleccionarPartidoParaEditar = (p) => {
    setPartidoEditandoId(p.id)
    setFechaNumeroPartido(p.fecha_numero)
    setFechaCalendario(p.jugado_el || new Date().toISOString().split('T')[0])
    setEquipoANombre(p.nombre_a)
    setEquipoAGoles(p.goles_a)
    setEquipoBNombre(p.nombre_b)
    setEquipoBGoles(p.goles_b)
  }

  const cancelarEdicionPartido = () => {
    setPartidoEditandoId(null)
    setEquipoAGoles(0)
    setEquipoBGoles(0)
  }

  const handleEliminarPartido = async (partidoId) => {
    if (!window.confirm('¿Seguro que deseas eliminar este partido?')) return

    const { error } = await supabase.from('partidos').delete().eq('id', partidoId)
    if (error) {
      alert('Error eliminando partido: ' + error.message)
    } else {
      alert('Partido eliminado.')
      cargarDatosTorneo(torneoActual.id)
    }
  }

  // --- EXPORTAR E IMPORTAR JSON ---
  const handleExportarJSON = async () => {
    if (!torneoActual) return

    const { data: jug } = await supabase.from('jugadores').select('*').eq('torneo_id', torneoActual.id)
    const { data: part } = await supabase.from('partidos').select('*').eq('torneo_id', torneoActual.id)

    const respaldo = {
      torneo: torneoActual,
      jugadores: jug || [],
      partidos: part || []
    }

    const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(JSON.stringify(respaldo, null, 2))}`
    const link = document.createElement('a')
    link.href = jsonString
    link.download = `${torneoActual.codigo || 'torneo'}-respaldo.json`
    link.click()
  }

  const handleImportarJSON = async (e) => {
    const archivo = e.target.files[0]
    if (!archivo || !torneoActual) return

    const reader = new FileReader()
    reader.onload = async (event) => {
      try {
        const datos = JSON.parse(event.target.result)
        if (datos.jugadores && datos.jugadores.length > 0) {
          const jugadoresNuevos = datos.jugadores.map(j => ({
            nombre: j.nombre,
            apodo: j.apodo,
            torneo_id: torneoActual.id
          }))
          await supabase.from('jugadores').insert(jugadoresNuevos)
          alert('¡Jugadores e información importados con éxito!')
          cargarDatosTorneo(torneoActual.id)
        }
      } catch (err) {
        alert('Error al leer archivo JSON: ' + err.message)
      }
    }
    reader.readAsText(archivo)
  }

  const validarPin = (e) => {
    e.preventDefault()
    if (pinAdmin === (torneoActual?.pin_admin || '1234')) {
      setEsAdmin(true)
    } else {
      alert('PIN Incorrecto')
    }
  }

  const obtenerInsignia = (index) => {
    if (index === 0) return { bg: 'bg-amber-500/20 text-amber-400 border-amber-500/40', label: '🥇 1°' }
    if (index === 1) return { bg: 'bg-slate-400/20 text-slate-300 border-slate-400/40', label: '🥈 2°' }
    if (index === 2) return { bg: 'bg-amber-700/20 text-amber-500 border-amber-700/40', label: '🥉 3°' }
    return { bg: 'bg-slate-800/60 text-slate-400 border-slate-700/50', label: `#${index + 1}` }
  }

  // --- VISTA 1: SELECCIÓN DE TORNEO ---
  if (!torneoActual) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 p-4 sm:p-6 font-sans">
        <div className="max-w-md mx-auto space-y-6 pt-4">
          <header className="text-center space-y-2">
            <h1 className="text-3xl font-extrabold text-white">⚽ Fútbol en Premios</h1>
            <p className="text-xs text-slate-400">Selecciona o crea la base de datos de tu torneo</p>
          </header>

          <form onSubmit={handleBuscarTorneoPorCodigo} className="bg-slate-900 border border-slate-800 p-4 rounded-xl space-y-2">
            <h3 className="text-xs font-bold text-slate-300 uppercase">🔍 Buscar por Código o Link</h3>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="ej: amigos-2026"
                value={busquedaCodigo}
                onChange={(e) => setBusquedaCodigo(e.target.value)}
                className="flex-1 bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-white"
              />
              <button type="submit" className="bg-emerald-500 font-bold text-slate-950 px-3 py-2 rounded-lg text-xs">
                Ingresar
              </button>
            </div>
          </form>

          <div className="space-y-2">
            <h3 className="text-xs font-bold text-slate-400 uppercase px-1">🌐 Torneos Públicos Disponibles</h3>
            {torneosPublicos.length === 0 ? (
              <p className="text-xs text-slate-500 text-center py-4 bg-slate-900/40 rounded-xl border border-slate-800">
                No hay torneos públicos. Podés buscar uno por código o crear el tuyo.
              </p>
            ) : (
              torneosPublicos.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setTorneoActual(t)}
                  className="w-full text-left bg-slate-900 hover:border-emerald-500/50 border border-slate-800 p-3.5 rounded-xl flex justify-between items-center transition-all"
                >
                  <div>
                    <h4 className="font-bold text-sm text-white">{t.nombre}</h4>
                    <p className="text-[10px] text-slate-400">Código: {t.codigo}</p>
                  </div>
                  <span className="text-xs text-emerald-400 font-semibold">Entrar →</span>
                </button>
              ))
            )}
          </div>

          <form onSubmit={handleCrearNuevoTorneo} className="bg-slate-900/60 border border-slate-800 p-4 rounded-xl space-y-3">
            <h3 className="text-xs font-bold text-emerald-400 uppercase">➕ Crear Mi Propio Torneo</h3>
            <input
              type="text"
              placeholder="Nombre del Torneo (ej: Liga Barrio Norte)"
              value={crearNombreTorneo}
              onChange={(e) => setCrearNombreTorneo(e.target.value)}
              required
              className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-white"
            />
            <input
              type="text"
              placeholder="Código Único (ej: barrio-norte-2026)"
              value={crearCodigoTorneo}
              onChange={(e) => setCrearCodigoTorneo(e.target.value)}
              required
              className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-white"
            />
            <div className="flex gap-2">
              <input
                type="password"
                placeholder="PIN Admin (ej: 1234)"
                value={crearPinTorneo}
                onChange={(e) => setCrearPinTorneo(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-white"
              />
              <label className="flex items-center gap-1.5 text-xs text-slate-400 min-w-max px-2">
                <input
                  type="checkbox"
                  checked={crearEsPublico}
                  onChange={(e) => setCrearEsPublico(e.target.checked)}
                />
                Público
              </label>
            </div>
            <button type="submit" className="w-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold py-2 rounded-lg text-xs">
              Crear Torneo
            </button>
          </form>
        </div>
      </div>
    )
  }

  // --- VISTA 2: DENTRO DEL TORNEO ---
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans p-4 sm:p-6 pb-12">
      <div className="max-w-md mx-auto space-y-5">
        
        {/* Encabezado */}
        <header className="relative text-center space-y-1.5 pt-2">
          <button
            onClick={() => setTorneoActual(null)}
            className="absolute left-0 top-2 p-2 text-slate-400 hover:text-white bg-slate-900 border border-slate-800 rounded-lg text-xs"
          >
            ← Cambiar
          </button>
          <button
            onClick={() => setPestanaActiva('admin')}
            className="absolute right-0 top-2 p-2 text-slate-400 hover:text-emerald-400 bg-slate-900 border border-slate-800 rounded-lg text-xs"
          >
            ⚙️ Admin
          </button>
          
          <span className="inline-block px-3 py-1 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[11px] font-semibold rounded-full uppercase tracking-wider">
            {torneoActual.nombre}
          </span>
          <h1 className="text-2xl font-extrabold tracking-tight text-white flex items-center justify-center gap-2">
            ⚽ Fútbol en Premios
          </h1>
        </header>

        {/* Navegación Principal */}
        <nav className="flex bg-slate-900 p-1 rounded-xl border border-slate-800 text-[11px] font-semibold gap-1">
          <button onClick={() => setPestanaActiva('goleadores')} className={`flex-1 py-2 rounded-lg ${pestanaActiva === 'goleadores' ? 'bg-emerald-500 text-slate-950 font-bold' : 'text-slate-400'}`}>
            📊 Tabla
          </button>
          <button onClick={() => setPestanaActiva('proximo')} className={`flex-1 py-2 rounded-lg ${pestanaActiva === 'proximo' ? 'bg-emerald-500 text-slate-950 font-bold' : 'text-slate-400'}`}>
            📅 Próximo
          </button>
          <button onClick={() => setPestanaActiva('partidos')} className={`flex-1 py-2 rounded-lg ${pestanaActiva === 'partidos' ? 'bg-emerald-500 text-slate-950 font-bold' : 'text-slate-400'}`}>
            🏟️ Fechas
          </button>
          <button onClick={() => setPestanaActiva('premios')} className={`flex-1 py-2 rounded-lg ${pestanaActiva === 'premios' ? 'bg-emerald-500 text-slate-950 font-bold' : 'text-slate-400'}`}>
            🏆 Premios
          </button>
        </nav>

        {/* Contenido */}
        <main>
          {cargando ? (
            <div className="flex justify-center items-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500"></div>
            </div>
          ) : (
            <>
              {/* PESTAÑA 1: GOLEADORES */}
              {pestanaActiva === 'goleadores' && (
                <div className="space-y-2.5">
                  {jugadores.length === 0 ? (
                    <p className="text-xs text-center text-slate-500 py-8">Aún no hay jugadores registrados en este torneo.</p>
                  ) : (
                    jugadores.map((jugador, index) => {
                      const id = jugador.jugador_id || jugador.id
                      const insignia = obtenerInsignia(index)
                      return (
                        <div key={id} className="flex items-center justify-between p-3 bg-slate-900 border border-slate-800 rounded-xl">
                          <div className="flex items-center gap-3">
                            <span className={`px-2 py-0.5 text-xs font-bold rounded-lg border ${insignia.bg}`}>
                              {insignia.label}
                            </span>
                            <div>
                              <p className="font-semibold text-sm text-slate-100">{jugador.nombre}</p>
                              {jugador.apodo && <p className="text-[11px] text-slate-400">"{jugador.apodo}"</p>}
                            </div>
                          </div>
                          <div className="flex items-center gap-2 text-right">
                            <div className="bg-slate-800/60 px-2 py-1 rounded-lg border border-slate-700/50">
                              <span className="text-[9px] text-slate-400 block uppercase">Goles</span>
                              <span className="text-xs font-bold text-emerald-400">⚽ {jugador.goles_totales || 0}</span>
                            </div>
                            <div className="bg-slate-800/60 px-2 py-1 rounded-lg border border-slate-700/50">
                              <span className="text-[9px] text-slate-400 block uppercase">Asist</span>
                              <span className="text-xs font-semibold text-slate-300">👟 {jugador.asistencias_totales || 0}</span>
                            </div>
                          </div>
                        </div>
                      )
                    })
                  )}
                </div>
              )}

              {/* PESTAÑA 2: PRÓXIMO PARTIDO */}
              {pestanaActiva === 'proximo' && (
                <div className="space-y-4">
                  {proximoPartido ? (
                    <div className="bg-gradient-to-b from-slate-900 to-slate-950 border border-emerald-500/30 rounded-2xl p-5 space-y-4 shadow-xl">
                      <div className="flex justify-between items-center border-b border-slate-800 pb-3">
                        <span className="text-xs font-bold text-emerald-400 uppercase tracking-widest">
                          Fecha #{proximoPartido.fecha_numero} — Anuncio Oficial
                        </span>
                        <span className="text-[10px] bg-emerald-500/10 text-emerald-300 px-2 py-0.5 rounded-full border border-emerald-500/20 font-semibold">
                          Próximamente
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-center py-2">
                        <div className="flex-1">
                          <div className="w-10 h-10 mx-auto mb-2 bg-blue-500/20 border border-blue-500/40 rounded-full flex items-center justify-center text-blue-400 font-bold">
                            A
                          </div>
                          <h3 className="font-extrabold text-base text-slate-100">{proximoPartido.nombre_a}</h3>
                        </div>
                        <span className="text-slate-500 font-black text-xl italic px-2">VS</span>
                        <div className="flex-1">
                          <div className="w-10 h-10 mx-auto mb-2 bg-emerald-500/20 border border-emerald-500/40 rounded-full flex items-center justify-center text-emerald-400 font-bold">
                            B
                          </div>
                          <h3 className="font-extrabold text-base text-slate-100">{proximoPartido.nombre_b}</h3>
                        </div>
                      </div>

                      <div className="border-t border-slate-800/80 pt-3 space-y-2">
                        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider text-center">
                          Alineación y Convocados
                        </h4>
                        {convocadosProximo.length === 0 ? (
                          <p className="text-xs text-center text-slate-500 py-2 italic">
                            Aún no se han asignado los convocados para esta fecha.
                          </p>
                        ) : (
                          <div className="grid grid-cols-2 gap-3 pt-1">
                            <div className="bg-slate-900/60 p-2.5 rounded-xl border border-slate-800">
                              <span className="text-[10px] font-bold text-blue-400 block mb-1.5 border-b border-slate-800 pb-1">
                                {proximoPartido.nombre_a}
                              </span>
                              <ul className="space-y-1">
                                {convocadosProximo.filter(c => c.lado === 'A').map(c => (
                                  <li key={c.id} className="text-xs text-slate-300">
                                    • {c.jugadores?.nombre} {c.jugadores?.apodo ? `("${c.jugadores.apodo}")` : ''}
                                  </li>
                                ))}
                              </ul>
                            </div>
                            <div className="bg-slate-900/60 p-2.5 rounded-xl border border-slate-800">
                              <span className="text-[10px] font-bold text-emerald-400 block mb-1.5 border-b border-slate-800 pb-1">
                                {proximoPartido.nombre_b}
                              </span>
                              <ul className="space-y-1">
                                {convocadosProximo.filter(c => c.lado === 'B').map(c => (
                                  <li key={c.id} className="text-xs text-slate-300">
                                    • {c.jugadores?.nombre} {c.jugadores?.apodo ? `("${c.jugadores.apodo}")` : ''}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-10 bg-slate-900/40 border border-slate-800 rounded-2xl space-y-2">
                      <p className="text-sm font-semibold text-slate-300">No hay ningún partido anunciado para la semana.</p>
                      <p className="text-xs text-slate-500">Usa el panel de Admin para programar una fecha.</p>
                    </div>
                  )}
                </div>
              )}

              {/* PESTAÑA 3: FECHAS */}
              {pestanaActiva === 'partidos' && (
                <div className="space-y-3">
                  {partidosJugados.length === 0 ? (
                    <p className="text-xs text-center text-slate-500 py-8">No hay partidos jugados registrados todavía.</p>
                  ) : (
                    partidosJugados.map((partido) => (
                      <div key={partido.id} className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-3">
                        <div className="flex justify-between items-center text-xs text-slate-400 border-b border-slate-800 pb-2">
                          <span className="font-semibold text-emerald-400 uppercase">Fecha #{partido.fecha_numero}</span>
                          <span>{partido.jugado_el}</span>
                        </div>
                        <div className="flex items-center justify-between py-1">
                          <span className="font-bold text-sm text-center flex-1">{partido.nombre_a}</span>
                          <span className="bg-slate-950 px-3 py-1 rounded-lg border border-slate-800 font-extrabold text-base text-emerald-400">
                            {partido.goles_a} - {partido.goles_b}
                          </span>
                          <span className="font-bold text-sm text-center flex-1">{partido.nombre_b}</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}

              {/* PESTAÑA 4: PREMIOS */}
              {pestanaActiva === 'premios' && (
                <div className="space-y-3">
                  {premiosOtorgados.length === 0 ? (
                    <p className="text-xs text-center text-slate-500 py-8">No hay premios entregados registrados todavía.</p>
                  ) : (
                    premiosOtorgados.map((item) => (
                      <div key={item.id} className="bg-slate-900 border border-slate-800 rounded-xl p-3.5 flex items-center justify-between">
                        <div>
                          <span className="text-[10px] font-bold text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-full uppercase">
                            {item.premios?.nombre}
                          </span>
                          <h3 className="font-bold text-sm text-slate-100 mt-1">
                            {item.jugadores?.nombre} {item.jugadores?.apodo ? `("${item.jugadores.apodo}")` : ''}
                          </h3>
                          <p className="text-[11px] text-slate-400">{item.premios?.descripcion}</p>
                        </div>
                        <span className="text-xs font-semibold text-slate-500">
                          Fecha #{item.partidos?.fecha_numero}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              )}

              {/* PESTAÑA 5: PANEL DE ADMIN MODULAR */}
              {pestanaActiva === 'admin' && (
                <div className="space-y-4">
                  {!esAdmin ? (
                    <form onSubmit={validarPin} className="bg-slate-900 border border-slate-800 p-5 rounded-2xl space-y-3 text-center">
                      <h3 className="font-bold text-base text-white">⚙️ Acceso Admin ({torneoActual?.nombre || 'Torneo'})</h3>
                      <p className="text-xs text-slate-400">Ingresa el PIN de administración</p>
                      <input
                        type="password"
                        placeholder="PIN Admin"
                        value={pinAdmin}
                        onChange={(e) => setPinAdmin(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-center text-sm text-white focus:outline-none focus:border-emerald-500"
                      />
                      <button type="submit" className="w-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold py-2.5 rounded-xl text-xs transition-all">
                        Ingresar
                      </button>
                    </form>
                  ) : (
                    <div className="space-y-4">
                      {/* Sub-navegación del Admin */}
                      <div className="flex bg-slate-900/90 p-1 rounded-xl border border-slate-800 text-[10px] font-semibold gap-1 overflow-x-auto">
                        <button
                          type="button"
                          onClick={() => setSubAdmin('proximo')}
                          className={`px-3 py-1.5 rounded-lg whitespace-nowrap transition-all ${subAdmin === 'proximo' ? 'bg-emerald-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'}`}
                        >
                          📢 Próximo
                        </button>
                        <button
                          type="button"
                          onClick={() => setSubAdmin('partidos')}
                          className={`px-3 py-1.5 rounded-lg whitespace-nowrap transition-all ${subAdmin === 'partidos' ? 'bg-emerald-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'}`}
                        >
                          ⚽ Partidos
                        </button>
                        <button
                          type="button"
                          onClick={() => setSubAdmin('jugadores')}
                          className={`px-3 py-1.5 rounded-lg whitespace-nowrap transition-all ${subAdmin === 'jugadores' ? 'bg-emerald-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'}`}
                        >
                          👤 Jugadores
                        </button>
                        <button
                          type="button"
                          onClick={() => setSubAdmin('premios')}
                          className={`px-3 py-1.5 rounded-lg whitespace-nowrap transition-all ${subAdmin === 'premios' ? 'bg-emerald-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'}`}
                        >
                          🏆 Premios
                        </button>
                        <button
                          type="button"
                          onClick={() => setSubAdmin('config')}
                          className={`px-3 py-1.5 rounded-lg whitespace-nowrap transition-all ${subAdmin === 'config' ? 'bg-emerald-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'}`}
                        >
                          ⚙️ Torneo
                        </button>
                        <button
                          type="button"
                          onClick={() => setSubAdmin('respaldos')}
                          className={`px-3 py-1.5 rounded-lg whitespace-nowrap transition-all ${subAdmin === 'respaldos' ? 'bg-emerald-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'}`}
                        >
                          📦 JSON
                        </button>
                      </div>

                      {/* SUB-SECCIÓN DE PRÓXIMO PARTIDO Y CONVOCADOS */}
                      {subAdmin === 'proximo' && (
                        <div className="space-y-4">
                          {!proximoPartido ? (
                            /* Formulario 1: Anunciar cuando NO hay partido programado */
                            <form onSubmit={handleAnunciarProximoPartido} className="bg-slate-900 border border-slate-800 p-4 rounded-xl space-y-3">
                              <h3 className="font-bold text-sm text-emerald-400 uppercase">📢 Programar y Anunciar Fecha</h3>
                              <div>
                                <label className="text-[10px] text-slate-400 block mb-1">N° de Fecha</label>
                                <input
                                  type="number"
                                  value={proximoFechaNumero}
                                  onChange={(e) => setProximoFechaNumero(e.target.value)}
                                  required
                                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-white"
                                />
                              </div>
                              <div>
                                <label className="text-[10px] text-slate-400 block mb-1">Nombre Equipo A</label>
                                <input
                                  type="text"
                                  value={proximoEquipoA}
                                  onChange={(e) => setProximoEquipoA(e.target.value)}
                                  required
                                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-white"
                                />
                              </div>
                              <div>
                                <label className="text-[10px] text-slate-400 block mb-1">Nombre Equipo B</label>
                                <input
                                  type="text"
                                  value={proximoEquipoB}
                                  onChange={(e) => setProximoEquipoB(e.target.value)}
                                  required
                                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-white"
                                />
                              </div>
                              <button type="submit" className="w-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold py-2 rounded-lg text-xs">
                                Publicar Anuncio
                              </button>
                            </form>
                          ) : (
                            /* Formulario 2: Seleccionar Convocados cuando YA hay un partido programado */
                            <div className="space-y-4">
                              <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl space-y-2">
                                <div className="flex justify-between items-center">
                                  <span className="text-xs font-bold text-emerald-400">Anuncio Activo — Fecha #{proximoPartido.fecha_numero}</span>
                                  <button
                                    type="button"
                                    onClick={handleCancelarProximoPartido}
                                    className="text-[10px] text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded border border-rose-500/20"
                                  >
                                    Cancel
                                  </button>
                                </div>
                                <p className="text-sm font-extrabold text-white">{proximoPartido.nombre_a} vs {proximoPartido.nombre_b}</p>
                                
                                <button
                                  type="button"
                                  onClick={handlePrepararCargaResultado}
                                  className="w-full bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/30 font-bold py-2 rounded-lg text-xs transition-all mt-2"
                                >
                                  🏁 Convertir en Partido Jugado y Cargar Resultado
                                </button>
                              </div>

                              <form onSubmit={handleGuardarConvocados} className="bg-slate-900 border border-slate-800 p-4 rounded-xl space-y-3">
                                <h3 className="font-bold text-sm text-emerald-400">📋 Armar Lista de Convocados</h3>
                                <p className="text-xs text-slate-400">Asigna a cada jugador de la lista al Equipo A o B:</p>

                                {jugadores.length === 0 ? (
                                  <p className="text-xs text-slate-500 italic py-2">Agrega jugadores al torneo en la pestaña 'Jugadores'.</p>
                                ) : (
                                  <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                                    {jugadores.map((j) => {
                                      const id = j.jugador_id || j.id
                                      const ladoActual = convocadosAdminState[id] || 'ninguno'
                                      return (
                                        <div key={id} className="bg-slate-950 p-2 rounded-lg border border-slate-800 flex justify-between items-center">
                                          <span className="text-xs font-semibold text-white">{j.nombre}</span>
                                          <select
                                            value={ladoActual}
                                            onChange={(e) => setConvocadosAdminState({
                                              ...convocadosAdminState,
                                              [id]: e.target.value
                                            })}
                                            className="bg-slate-900 text-xs border border-slate-700 text-slate-200 rounded px-2 py-1"
                                          >
                                            <option value="ninguno">No convocado</option>
                                            <option value="A">{proximoPartido.nombre_a}</option>
                                            <option value="B">{proximoPartido.nombre_b}</option>
                                          </select>
                                        </div>
                                      )
                                    })}
                                  </div>
                                )}

                                <button type="submit" className="w-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold py-2 rounded-lg text-xs">
                                  💾 Guardar Convocados
                                </button>
                              </form>
                            </div>
                          )}
                        </div>
                      )}

                      {/* SUB-SECCIÓN 1: GESTIÓN DE PARTIDOS JUGADOS */}
                      {subAdmin === 'partidos' && (
                        <div className="space-y-4">
                          <form onSubmit={handleGuardarPartidoJugado} className="bg-slate-900 border border-slate-800 p-4 rounded-xl space-y-4">
                            <h3 className="font-bold text-sm text-emerald-400 border-b border-slate-800 pb-2 flex justify-between items-center">
                              <span>{partidoEditandoId ? '✏️ Editar Partido' : '⚽ Cargar Nuevo Partido Jugado'}</span>
                              {partidoEditandoId && (
                                <button
                                  type="button"
                                  onClick={cancelarEdicionPartido}
                                  className="text-[10px] text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded border border-rose-500/20"
                                >
                                  Cancelar Edición
                                </button>
                              )}
                            </h3>

                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <label className="text-[10px] text-slate-400 block mb-1">N° Fecha</label>
                                <input
                                  type="number"
                                  value={fechaNumeroPartido}
                                  onChange={(e) => setFechaNumeroPartido(e.target.value)}
                                  required
                                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-white"
                                />
                              </div>
                              <div>
                                <label className="text-[10px] text-slate-400 block mb-1">Fecha Calendario</label>
                                <input
                                  type="date"
                                  value={fechaCalendario}
                                  onChange={(e) => setFechaCalendario(e.target.value)}
                                  required
                                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-white"
                                />
                              </div>
                            </div>

                            <div className="space-y-2 bg-slate-950/60 p-3 rounded-lg border border-slate-800">
                              <div className="grid grid-cols-3 gap-2 items-center">
                                <input
                                  type="text"
                                  placeholder="Equipo A"
                                  value={equipoANombre}
                                  onChange={(e) => setEquipoANombre(e.target.value)}
                                  className="bg-slate-900 border border-slate-800 rounded-lg p-2 text-xs text-white font-bold"
                                />
                                <span className="text-center font-bold text-xs text-slate-500">GOLES</span>
                                <input
                                  type="text"
                                  placeholder="Equipo B"
                                  value={equipoBNombre}
                                  onChange={(e) => setEquipoBNombre(e.target.value)}
                                  className="bg-slate-900 border border-slate-800 rounded-lg p-2 text-xs text-white font-bold text-right"
                                />
                              </div>

                              <div className="grid grid-cols-2 gap-3 pt-1">
                                <input
                                  type="number"
                                  min="0"
                                  value={equipoAGoles}
                                  onChange={(e) => setEquipoAGoles(e.target.value)}
                                  className="bg-slate-900 border border-slate-800 rounded-lg p-2 text-center text-sm font-bold text-emerald-400"
                                />
                                <input
                                  type="number"
                                  min="0"
                                  value={equipoBGoles}
                                  onChange={(e) => setEquipoBGoles(e.target.value)}
                                  className="bg-slate-900 border border-slate-800 rounded-lg p-2 text-center text-sm font-bold text-emerald-400"
                                />
                              </div>
                            </div>

                            {!partidoEditandoId && (
                              <>
                                {/* Selección de Estadísticas por Jugador */}
                                <div className="space-y-2 pt-1">
                                  <h4 className="text-xs font-bold text-slate-300">👥 Estadísticas de Jugadores</h4>
                                  {jugadores.length === 0 ? (
                                    <p className="text-xs text-slate-500 italic">No hay jugadores registrados todavía.</p>
                                  ) : (
                                    <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                                      {jugadores.map((j) => {
                                        const id = j.jugador_id || j.id
                                        const statActual = statsJugadoresPartido[id] || { lado: 'ninguno', goles: 0, asistencias: 0 }
                                        return (
                                          <div key={id} className="bg-slate-950 p-2 rounded-lg border border-slate-800 flex flex-col gap-1.5">
                                            <div className="flex justify-between items-center">
                                              <span className="text-xs font-semibold text-white">{j.nombre}</span>
                                              <select
                                                value={statActual.lado}
                                                onChange={(e) => setStatsJugadoresPartido({
                                                  ...statsJugadoresPartido,
                                                  [id]: { ...statActual, lado: e.target.value }
                                                })}
                                                className="bg-slate-900 text-xs border border-slate-700 text-slate-200 rounded px-2 py-0.5"
                                              >
                                                <option value="ninguno">No jugó</option>
                                                <option value="A">{equipoANombre || 'Equipo A'}</option>
                                                <option value="B">{equipoBNombre || 'Equipo B'}</option>
                                              </select>
                                            </div>
                                            {statActual.lado !== 'ninguno' && (
                                              <div className="flex items-center justify-end gap-3">
                                                <span className="text-[10px] text-slate-400">⚽ Goles:</span>
                                                <input
                                                  type="number"
                                                  min="0"
                                                  value={statActual.goles}
                                                  onChange={(e) => setStatsJugadoresPartido({
                                                    ...statsJugadoresPartido,
                                                    [id]: { ...statActual, goles: Number(e.target.value) }
                                                  })}
                                                  className="w-10 bg-slate-900 border border-slate-700 rounded text-xs text-center text-emerald-400 font-bold"
                                                />
                                                <span className="text-[10px] text-slate-400">👟 Asist:</span>
                                                <input
                                                  type="number"
                                                  min="0"
                                                  value={statActual.asistencias}
                                                  onChange={(e) => setStatsJugadoresPartido({
                                                    ...statsJugadoresPartido,
                                                    [id]: { ...statActual, asistencias: Number(e.target.value) }
                                                  })}
                                                  className="w-10 bg-slate-900 border border-slate-700 rounded text-xs text-center text-slate-200 font-bold"
                                                />
                                              </div>
                                            )}
                                          </div>
                                        )
                                      })}
                                    </div>
                                  )}
                                </div>

                                {/* Asignación de Premios del Partido */}
                                <div className="space-y-2 pt-2 border-t border-slate-800">
                                  <h4 className="text-xs font-bold text-amber-400">🏆 Asignar Premios de la Fecha</h4>
                                  {listaPremios.length === 0 ? (
                                    <p className="text-xs text-slate-500 italic">No hay premios configurados.</p>
                                  ) : (
                                    listaPremios.map((premio) => (
                                      <div key={premio.id} className="flex justify-between items-center bg-slate-950 p-2 rounded-lg border border-slate-800">
                                        <span className="text-xs font-semibold text-slate-300">{premio.nombre}</span>
                                        <select
                                          value={premiosPartido[premio.id] || ''}
                                          onChange={(e) => setPremiosPartido({
                                            ...premiosPartido,
                                            [premio.id]: e.target.value
                                          })}
                                          className="bg-slate-900 text-xs border border-slate-700 text-slate-200 rounded px-2 py-1 max-w-[150px]"
                                        >
                                          <option value="">Sin entregar</option>
                                          {jugadores.map((j) => {
                                            const id = j.jugador_id || j.id
                                            return (
                                              <option key={id} value={id}>
                                                {j.nombre}
                                              </option>
                                            )
                                          })}
                                        </select>
                                      </div>
                                    ))
                                  )}
                                </div>
                              </>
                            )}

                            <button
                              type="submit"
                              className="w-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold py-2 rounded-xl text-xs"
                            >
                              {partidoEditandoId ? 'Guardar Cambios del Partido' : '💾 Guardar Partido'}
                            </button>
                          </form>

                          {/* Lista de Partidos para Editar/Eliminar */}
                          <div className="space-y-2">
                            <h4 className="text-xs font-bold text-slate-400 uppercase">Partidos Cargados</h4>
                            {partidosJugados.length === 0 ? (
                              <p className="text-xs text-slate-500 italic py-2">No hay partidos cargados aún.</p>
                            ) : (
                              partidosJugados.map((p) => (
                                <div key={p.id} className="bg-slate-900 border border-slate-800 p-3 rounded-xl flex justify-between items-center">
                                  <div>
                                    <span className="text-[10px] font-bold text-emerald-400">Fecha #{p.fecha_numero}</span>
                                    <p className="text-xs font-semibold text-white">{p.nombre_a} {p.goles_a} - {p.goles_b} {p.nombre_b}</p>
                                  </div>
                                  <div className="flex gap-2">
                                    <button
                                      type="button"
                                      onClick={() => seleccionarPartidoParaEditar(p)}
                                      className="bg-slate-800 hover:bg-slate-700 text-slate-200 p-1.5 rounded text-xs border border-slate-700"
                                    >
                                      ✏️
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleEliminarPartido(p.id)}
                                      className="bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 p-1.5 rounded text-xs border border-rose-500/30"
                                    >
                                      🗑️
                                    </button>
                                  </div>
                                </div>
                              ))
                            )}
                          </div>
                        </div>
                      )}

                      {/* SUB-SECCIÓN 2: GESTIÓN DE JUGADORES */}
                      {subAdmin === 'jugadores' && (
                        <div className="space-y-4">
                          <form onSubmit={handleGuardarJugador} className="bg-slate-900 border border-slate-800 p-4 rounded-xl space-y-3">
                            <h3 className="font-bold text-sm text-emerald-400 flex justify-between items-center">
                              <span>{jugadorEditandoId ? '✏️ Editar Jugador' : '👤 Agregar Jugador'}</span>
                              {jugadorEditandoId && (
                                <button
                                  type="button"
                                  onClick={cancelarEdicionJugador}
                                  className="text-[10px] text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded border border-rose-500/20"
                                >
                                  Cancelar Edición
                                </button>
                              )}
                            </h3>
                            <input
                              type="text"
                              placeholder="Nombre (ej: Martin)"
                              value={nuevoNombre}
                              onChange={(e) => setNuevoNombre(e.target.value)}
                              required
                              className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-white"
                            />
                            <input
                              type="text"
                              placeholder="Apodo opcional (ej: Tincho)"
                              value={nuevoApodo}
                              onChange={(e) => setNuevoApodo(e.target.value)}
                              className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-white"
                            />
                            <button type="submit" className="w-full bg-emerald-500 text-slate-950 font-bold py-2 rounded-lg text-xs">
                              {jugadorEditandoId ? 'Guardar Cambios' : 'Guardar Jugador'}
                            </button>
                          </form>

                          {/* Lista de Jugadores para Editar/Eliminar */}
                          <div className="space-y-2">
                            <h4 className="text-xs font-bold text-slate-400 uppercase">Plantel de Jugadores</h4>
                            {jugadores.length === 0 ? (
                              <p className="text-xs text-slate-500 italic py-2">No hay jugadores registrados.</p>
                            ) : (
                              jugadores.map((j) => {
                                const id = j.jugador_id || j.id
                                return (
                                  <div key={id} className="bg-slate-900 border border-slate-800 p-3 rounded-xl flex justify-between items-center">
                                    <div>
                                      <p className="text-xs font-bold text-white">{j.nombre}</p>
                                      {j.apodo && <p className="text-[10px] text-slate-400">"{j.apodo}"</p>}
                                    </div>
                                    <div className="flex gap-2">
                                      <button
                                        type="button"
                                        onClick={() => seleccionarJugadorParaEditar(j)}
                                        className="bg-slate-800 hover:bg-slate-700 text-slate-200 px-2 py-1 rounded text-xs border border-slate-700"
                                      >
                                        ✏️
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => handleEliminarJugador(id, j.nombre)}
                                        className="bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 px-2 py-1 rounded text-xs border border-rose-500/30"
                                      >
                                        🗑️
                                      </button>
                                    </div>
                                  </div>
                                )
                              })
                            )}
                          </div>
                        </div>
                      )}

                      {/* SUB-SECCIÓN 3: GESTIÓN DE PREMIOS */}
                      {subAdmin === 'premios' && (
                        <div className="space-y-4">
                          <form onSubmit={handleCrearPremio} className="bg-slate-900 border border-slate-800 p-4 rounded-xl space-y-3">
                            <h3 className="font-bold text-sm text-amber-400">🏆 Agregar Nuevo Tipo de Premio</h3>
                            <input
                              type="text"
                              placeholder="Nombre del Premio (ej: Atajada de la Fecha)"
                              value={nombreNuevoPremio}
                              onChange={(e) => setNombreNuevoPremio(e.target.value)}
                              required
                              className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-white"
                            />
                            <input
                              type="text"
                              placeholder="Descripción opcional"
                              value={descNuevoPremio}
                              onChange={(e) => setDescNuevoPremio(e.target.value)}
                              className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-white"
                            />
                            <button type="submit" className="w-full bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold py-2 rounded-lg text-xs">
                              Crear Premio
                            </button>
                          </form>

                          <div className="space-y-2">
                            <h4 className="text-xs font-bold text-slate-400 uppercase">Premios Disponibles</h4>
                            {listaPremios.length === 0 ? (
                              <p className="text-xs text-slate-500 italic py-2">No hay premios configurados.</p>
                            ) : (
                              listaPremios.map((p) => (
                                <div key={p.id} className="bg-slate-900 border border-slate-800 p-3 rounded-xl flex justify-between items-center">
                                  <div>
                                    <p className="text-xs font-bold text-amber-400">{p.nombre}</p>
                                    {p.descripcion && <p className="text-[10px] text-slate-400">{p.descripcion}</p>}
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => handleEliminarPremio(p.id)}
                                    className="bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 px-2 py-1 rounded text-xs border border-rose-500/30"
                                  >
                                    🗑️
                                  </button>
                                </div>
                              ))
                            )}
                          </div>
                        </div>
                      )}

                      {/* SUB-SECCIÓN 4: CONFIGURACIÓN DEL TORNEO */}
                      {subAdmin === 'config' && (
                        <div className="space-y-4">
                          <form onSubmit={handleGuardarCambiosTorneo} className="bg-slate-900 border border-slate-800 p-4 rounded-xl space-y-3">
                            <h3 className="font-bold text-sm text-emerald-400">⚙️ Editar Datos del Torneo</h3>
                            <div>
                              <label className="text-[10px] text-slate-400 block mb-1">Nombre del Torneo</label>
                              <input
                                type="text"
                                value={editTorneoNombre}
                                onChange={(e) => setEditTorneoNombre(e.target.value)}
                                required
                                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-white"
                              />
                            </div>
                            <div>
                              <label className="text-[10px] text-slate-400 block mb-1">Código Único (Link/Búsqueda)</label>
                              <input
                                type="text"
                                value={editTorneoCodigo}
                                onChange={(e) => setEditTorneoCodigo(e.target.value)}
                                required
                                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-white"
                              />
                            </div>
                            <div>
                              <label className="text-[10px] text-slate-400 block mb-1">PIN / Contraseña de Admin</label>
                              <input
                                type="text"
                                value={editTorneoPin}
                                onChange={(e) => setEditTorneoPin(e.target.value)}
                                required
                                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-white font-mono"
                              />
                            </div>
                            <button type="submit" className="w-full bg-emerald-500 text-slate-950 font-bold py-2 rounded-lg text-xs">
                              Guardar Datos del Torneo
                            </button>
                          </form>

                          <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl space-y-3">
                            <h3 className="font-bold text-sm text-slate-200">🔒 Privacidad y Borrado</h3>
                            <div className="flex justify-between items-center bg-slate-950 p-3 rounded-lg border border-slate-800">
                              <div>
                                <p className="text-xs font-semibold text-white">Estado Actual</p>
                                <p className="text-[10px] text-slate-400">
                                  El torneo es <strong className="text-emerald-400">{torneoActual?.es_publico ? 'PÚBLICO' : 'PRIVADO'}</strong>
                                </p>
                              </div>
                              <button
                                type="button"
                                onClick={handleCambiarPrivacidad}
                                className="bg-slate-800 hover:bg-slate-700 text-xs px-3 py-1.5 rounded-lg border border-slate-700 text-slate-200 font-semibold"
                              >
                                Hacer {torneoActual?.es_publico ? 'Privado' : 'Público'}
                              </button>
                            </div>

                            <button
                              type="button"
                              onClick={handleEliminarTorneo}
                              className="w-full bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 font-semibold py-2 rounded-lg text-xs transition-all"
                            >
                              🗑️ Eliminar este Torneo Permanentemente
                            </button>
                          </div>
                        </div>
                      )}

                      {/* SUB-SECCIÓN 5: RESPALDOS JSON */}
                      {subAdmin === 'respaldos' && (
                        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl space-y-3">
                          <h3 className="font-bold text-sm text-amber-400">📦 Copia de Seguridad (JSON)</h3>
                          <p className="text-xs text-slate-400">
                            Guarda un respaldo completo de tus jugadores y partidos en tu dispositivo, o carga uno existente.
                          </p>
                          <div className="grid grid-cols-2 gap-2 pt-1">
                            <button
                              type="button"
                              onClick={handleExportarJSON}
                              className="bg-slate-800 hover:bg-slate-700 text-white font-semibold py-2 rounded-lg text-xs border border-slate-700"
                            >
                              💾 Guardar (JSON)
                            </button>
                            <label className="bg-slate-800 hover:bg-slate-700 text-white font-semibold py-2 rounded-lg text-xs border border-slate-700 text-center cursor-pointer">
                              📂 Cargar (JSON)
                              <input
                                type="file"
                                accept=".json"
                                onChange={handleImportarJSON}
                                className="hidden"
                              />
                            </label>
                          </div>
                        </div>
                      )}

                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </main>
      </div>
    </div>
  )
}

export default App
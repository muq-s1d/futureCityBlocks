import { useEffect, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { VoxelBlocksMesh, type VoxelBlocksHandle } from '@/components/r3f/VoxelBlocksMesh.r3f'
import { BlockHighlight } from '@/components/builder/BlockHighlight.r3f'
import {
  BLOCK_COLOR,
  builderArrivalPose,
  BUILDER_BOUNDS,
  CELL,
  FLY_SPEED,
  MAX_REACH,
  MOUSE_SENSITIVITY,
} from '@/constants/builder'
import { PALETTE } from '@/constants/palette'
import { plotWorldX, plotWorldZ } from '@/lib/cityGrid'
import { useAuthStore } from '@/stores/authStore'
import { useBuilderStore } from '@/stores/builderStore'

/**
 * First-person flying voxel editor (Minecraft-style). Owns the camera entirely
 * while stage === 'builder' (CityField's own useFrame is guarded off for this
 * stage, so the two never fight). WASD + mouse-look via the Pointer Lock API,
 * Space/Shift fly up/down, centre-crosshair raycast highlights the targeted cell;
 * left-click breaks, right-click places the hotbar-selected block.
 *
 * Pointer lock is requested from a DOM user gesture (the HUD's CLICK TO BUILD /
 * Resume buttons call the fn we register on mount) — never from an effect, which
 * the browser would silently ignore. Lock loss (incl. the unconditional Escape
 * exit) is detected via `pointerlockchange`, not a keydown handler.
 */

const W = BUILDER_BOUNDS.w
const D = BUILDER_BOUNDS.d
const H = BUILDER_BOUNDS.h
const PAD = 4 // how far outside the volume the camera may fly (to see outer faces)

type HitKind = 'none' | 'block' | 'ground'

export function BuilderScene() {
  const { camera, gl } = useThree()
  const ownedPlot = useAuthStore((s) => s.ownedPlot)
  const blocks = useBuilderStore((s) => s.blocks)
  const registerLock = useBuilderStore((s) => s.registerLock)
  const registerCapture = useBuilderStore((s) => s.registerCapture)
  const setLocked = useBuilderStore((s) => s.setLocked)

  const voxelRef = useRef<VoxelBlocksHandle>(null)
  const highlightRef = useRef<THREE.Mesh>(null)
  const baseRef = useRef<THREE.Mesh>(null)

  // Plot world centre + the build volume's min corner (group origin).
  const { cx, cz, originX, originZ } = useMemo(() => {
    const wx = ownedPlot ? plotWorldX(ownedPlot.grid_x) : 0
    const wz = ownedPlot ? plotWorldZ(ownedPlot.grid_z) : 0
    return { cx: wx, cz: wz, originX: wx - (W * CELL) / 2, originZ: wz - (D * CELL) / 2 }
  }, [ownedPlot])

  // FPS camera state (refs, never re-rendered): world position + look angles.
  const pos = useRef(new THREE.Vector3())
  const yaw = useRef(0)
  const pitch = useRef(0)
  const initialized = useRef(false)
  const introDone = useRef(false)
  const lockedRef = useRef(false)
  const keys = useRef<Record<string, boolean>>({})
  // Last raycast result, read by the click handlers.
  const hit = useRef({ kind: 'none' as HitKind, cx: 0, cy: 0, cz: 0, px: 0, py: 0, pz: 0 })
  const lastCrosshair = useRef('')
  const tmpColor = useMemo(() => new THREE.Color(), [])

  // Home pose: in front of (+z) and above the plot, looking down at its centre.
  const home = useMemo(() => {
    const arrival = builderArrivalPose(cx, cz)
    const p = new THREE.Vector3(...arrival.pos)
    const target = new THREE.Vector3(...arrival.tgt)
    const dir = target.clone().sub(p).normalize()
    const pit = Math.asin(THREE.MathUtils.clamp(dir.y, -1, 1))
    const cosP = Math.cos(pit) || 1e-4
    const ya = Math.atan2(-dir.x / cosP, -dir.z / cosP)
    return { pos: p, yaw: ya, pitch: pit }
  }, [cx, cz])

  // ── Input + pointer-lock wiring (registered once) ──
  useEffect(() => {
    const el = gl.domElement
    registerLock(() => {
      // Promise-returning in modern browsers; ignore rejection (must be a gesture).
      void Promise.resolve(el.requestPointerLock()).catch(() => {})
    })
    registerCapture(() => el.toDataURL('image/png'))

    const onLockChange = () => {
      const locked = document.pointerLockElement === el
      lockedRef.current = locked
      if (!locked) keys.current = {}
      setLocked(locked)
    }
    const onMouseMove = (e: MouseEvent) => {
      if (!lockedRef.current) return
      yaw.current -= e.movementX * MOUSE_SENSITIVITY
      pitch.current -= e.movementY * MOUSE_SENSITIVITY
      const lim = Math.PI / 2 - 0.05
      pitch.current = THREE.MathUtils.clamp(pitch.current, -lim, lim)
    }
    const onKeyDown = (e: KeyboardEvent) => {
      if (!lockedRef.current) return
      keys.current[e.code] = true
      e.preventDefault()
    }
    const onKeyUp = (e: KeyboardEvent) => {
      keys.current[e.code] = false
    }
    const onMouseDown = (e: MouseEvent) => {
      if (!lockedRef.current) return
      const h = hit.current
      if (e.button === 0) {
        // Left-click breaks the targeted block (the ground can't be broken).
        if (h.kind === 'block') useBuilderStore.getState().removeBlock(h.cx, h.cy, h.cz)
      } else if (e.button === 2) {
        // Right-click places on the targeted face / ground cell, if in-bounds.
        if (h.kind === 'none') return
        if (h.px < 0 || h.px >= W || h.py < 0 || h.py >= H || h.pz < 0 || h.pz >= D) return
        const type = useBuilderStore.getState().selectedBlockType
        useBuilderStore.getState().placeBlock({ x: h.px, y: h.py, z: h.pz, type })
      }
    }
    const onContextMenu = (e: Event) => e.preventDefault()

    document.addEventListener('pointerlockchange', onLockChange)
    document.addEventListener('mousemove', onMouseMove)
    document.addEventListener('keydown', onKeyDown)
    document.addEventListener('keyup', onKeyUp)
    document.addEventListener('mousedown', onMouseDown)
    el.addEventListener('contextmenu', onContextMenu)

    return () => {
      document.removeEventListener('pointerlockchange', onLockChange)
      document.removeEventListener('mousemove', onMouseMove)
      document.removeEventListener('keydown', onKeyDown)
      document.removeEventListener('keyup', onKeyUp)
      document.removeEventListener('mousedown', onMouseDown)
      el.removeEventListener('contextmenu', onContextMenu)
      if (document.pointerLockElement === el) document.exitPointerLock()
      registerLock(null)
      registerCapture(null)
    }
  }, [gl, registerLock, registerCapture, setLocked])

  const raycaster = useMemo(() => {
    const r = new THREE.Raycaster()
    r.far = MAX_REACH * CELL // reach cap; set once (mutating it per-frame trips the immutability lint)
    return r
  }, [])
  // Bounds-cage wireframe geometry — built once, not per render (blocks change often).
  const cageGeo = useMemo(
    () => new THREE.EdgesGeometry(new THREE.BoxGeometry(W * CELL, H * CELL, D * CELL)),
    [],
  )
  const screenCentre = useMemo(() => new THREE.Vector2(0, 0), [])
  const euler = useMemo(() => new THREE.Euler(0, 0, 0, 'YXZ'), [])
  const moveVec = useMemo(() => new THREE.Vector3(), [])

  const setCrosshair = (c: string) => {
    if (lastCrosshair.current !== c) {
      lastCrosshair.current = c
      document.documentElement.style.setProperty('--crosshair-color', c)
    }
  }

  useFrame((_, dt) => {
    // Initialise from wherever the plot fly-in parked the camera (no snap), then
    // ease to the builder home pose until the player takes the controls.
    if (!initialized.current) {
      pos.current.copy(camera.position)
      const e = new THREE.Euler().setFromQuaternion(camera.quaternion, 'YXZ')
      yaw.current = e.y
      pitch.current = e.x
      initialized.current = true
    }

    const locked = lockedRef.current
    if (locked) {
      introDone.current = true
      const speed = FLY_SPEED * dt
      const k = keys.current
      const fwd = moveVec.set(-Math.sin(yaw.current), 0, -Math.cos(yaw.current))
      const rightX = Math.cos(yaw.current)
      const rightZ = -Math.sin(yaw.current)
      let dx = 0
      let dz = 0
      if (k['KeyW']) {
        dx += fwd.x
        dz += fwd.z
      }
      if (k['KeyS']) {
        dx -= fwd.x
        dz -= fwd.z
      }
      if (k['KeyD']) {
        dx += rightX
        dz += rightZ
      }
      if (k['KeyA']) {
        dx -= rightX
        dz -= rightZ
      }
      const len = Math.hypot(dx, dz)
      if (len > 0) {
        pos.current.x += (dx / len) * speed
        pos.current.z += (dz / len) * speed
      }
      if (k['Space']) pos.current.y += speed
      if (k['ShiftLeft'] || k['ShiftRight']) pos.current.y -= speed
    } else if (!introDone.current) {
      const a = 1 - Math.exp(-3 * dt)
      pos.current.lerp(home.pos, a)
      yaw.current += (home.yaw - yaw.current) * a
      pitch.current += (home.pitch - pitch.current) * a
      if (pos.current.distanceToSquared(home.pos) < 0.01) introDone.current = true
    }

    // Clamp to the build volume + padding so you can't fly off into the city.
    pos.current.x = THREE.MathUtils.clamp(pos.current.x, originX - PAD, originX + W * CELL + PAD)
    pos.current.z = THREE.MathUtils.clamp(pos.current.z, originZ - PAD, originZ + D * CELL + PAD)
    pos.current.y = THREE.MathUtils.clamp(pos.current.y, 0.8, H * CELL + PAD)

    camera.position.copy(pos.current)
    euler.set(pitch.current, yaw.current, 0)
    camera.quaternion.setFromEuler(euler)

    // Centre-crosshair raycast — every frame while locked so the click handlers
    // always read a fresh hit (no stale-by-one-frame placement errors).
    const hl = highlightRef.current
    if (!locked) {
      if (hl) hl.visible = false
      setCrosshair('#ffffff')
      return
    }

    raycaster.setFromCamera(screenCentre, camera)
    const targets: THREE.Object3D[] = []
    if (baseRef.current) targets.push(baseRef.current)
    const meshes = voxelRef.current?.meshes
    if (meshes) for (const m of meshes) if (m) targets.push(m)

    const hits = raycaster.intersectObjects(targets, false)

    // Prefer block hits for placement so the baseplate can't steal the target
    // when the crosshair lands just past a block's top edge.
    let blockHit: THREE.Intersection | undefined
    let groundHit: THREE.Intersection | undefined
    for (const h of hits) {
      if (h.object === baseRef.current) {
        if (!groundHit) groundHit = h
      } else if (h.instanceId != null) {
        if (!blockHit) { blockHit = h; break }
      }
    }
    const chosen = blockHit ?? groundHit

    if (!chosen) {
      hit.current.kind = 'none'
      if (hl) hl.visible = false
      setCrosshair('#ffffff')
      return
    }

    if (chosen === groundHit && chosen.object === baseRef.current) {
      const gx = THREE.MathUtils.clamp(Math.floor((chosen.point.x - originX) / CELL), 0, W - 1)
      const gz = THREE.MathUtils.clamp(Math.floor((chosen.point.z - originZ) / CELL), 0, D - 1)
      hit.current = { kind: 'ground', cx: gx, cy: 0, cz: gz, px: gx, py: 0, pz: gz }
      if (hl) {
        hl.visible = true
        hl.position.set((gx + 0.5) * CELL, 0.5 * CELL, (gz + 0.5) * CELL)
      }
      setCrosshair('#ffffff')
    } else if (chosen.instanceId != null) {
      const block = voxelRef.current?.pickCell(chosen.object, chosen.instanceId)
      const n = chosen.face?.normal
      if (block && n) {
        // face.normal is geometry-local; safe while the builder group has no rotation.
        const px = block.x + Math.round(n.x)
        const py = block.y + Math.round(n.y)
        const pz = block.z + Math.round(n.z)
        hit.current = { kind: 'block', cx: block.x, cy: block.y, cz: block.z, px, py, pz }
        if (hl) {
          const inBounds = px >= 0 && px < W && py >= 0 && py < H && pz >= 0 && pz < D
          hl.visible = inBounds
          hl.position.set((px + 0.5) * CELL, (py + 0.5) * CELL, (pz + 0.5) * CELL)
        }
        tmpColor.set(block.color ?? BLOCK_COLOR[block.type])
        const lum = 0.299 * tmpColor.r + 0.587 * tmpColor.g + 0.114 * tmpColor.b
        setCrosshair(lum > 0.45 ? '#000000' : '#ffffff')
      }
    }
  })

  return (
    <group position={[originX, 0, originZ]}>
      <VoxelBlocksMesh ref={voxelRef} blocks={blocks} />
      <BlockHighlight ref={highlightRef} />

      {/* Baseplate: the ground raycast target + a visible floor for the lot. */}
      <mesh ref={baseRef} rotation-x={-Math.PI / 2} position={[(W * CELL) / 2, 0, (D * CELL) / 2]}>
        <planeGeometry args={[W * CELL, D * CELL]} />
        <meshStandardMaterial color={PALETTE.surface} roughness={0.9} metalness={0.05} />
      </mesh>

      {/* Bounds cage — faint wireframe so the buildable volume is legible. */}
      <lineSegments
        geometry={cageGeo}
        position={[(W * CELL) / 2, (H * CELL) / 2, (D * CELL) / 2]}
      >
        <lineBasicMaterial color={PALETTE.border} transparent opacity={0.4} toneMapped={false} />
      </lineSegments>

      {/* Fill light so blocks read even at night — reaches the full tall volume. */}
      <pointLight
        position={[(W * CELL) / 2, H * CELL * 0.7, (D * CELL) / 2]}
        intensity={0.85}
        distance={H * CELL * 3}
      />
    </group>
  )
}

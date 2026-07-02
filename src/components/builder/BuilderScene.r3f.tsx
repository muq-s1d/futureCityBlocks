import { useEffect, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { VoxelBlocksMesh, type VoxelBlocksHandle } from '@/components/r3f/VoxelBlocksMesh.r3f'
import { AssetGhostPreview } from '@/components/r3f/AssetGhostPreview.r3f'
import { BlockHighlight } from '@/components/builder/BlockHighlight.r3f'
import {
  BLOCK_COLOR,
  builderArrivalPose,
  builderBoundsForConfig,
  CELL,
  FLY_SPEED,
  MAX_REACH,
  MOUSE_SENSITIVITY,
} from '@/constants/builder'
import { PALETTE } from '@/constants/palette'
import { plotWorldX, plotWorldZ } from '@/lib/cityGrid'
import { useAuthStore } from '@/stores/authStore'
import { useBuilderStore } from '@/stores/builderStore'
import { useWorldConfigStore } from '@/stores/worldConfigStore'

const PAD = 4

type HitKind = 'none' | 'block' | 'ground'

export function BuilderScene() {
  const { camera, gl } = useThree()
  const ownedPlot = useAuthStore((s) => s.ownedPlot)
  const blocks = useBuilderStore((s) => s.blocks)
  const fillMode = useBuilderStore((s) => s.fillMode)
  const fillAnchor = useBuilderStore((s) => s.fillAnchor)
  const armedAsset = useBuilderStore((s) => s.armedAsset)
  const placementRotY = useBuilderStore((s) => s.placementRotY)
  const registerLock = useBuilderStore((s) => s.registerLock)
  const registerCapture = useBuilderStore((s) => s.registerCapture)
  const setLocked = useBuilderStore((s) => s.setLocked)
  const cityConfig = useWorldConfigStore((s) => s.cityConfig)

  const bounds = useMemo(() => builderBoundsForConfig(cityConfig), [cityConfig])
  const W = bounds.w
  const D = bounds.d
  const H = bounds.h

  const voxelRef = useRef<VoxelBlocksHandle>(null)
  const highlightRef = useRef<THREE.Mesh>(null)
  const baseRef = useRef<THREE.Mesh>(null)

  const { cx, cz, originX, originZ } = useMemo(() => {
    const wx = ownedPlot ? plotWorldX(ownedPlot.grid_x, cityConfig) : 0
    const wz = ownedPlot ? plotWorldZ(ownedPlot.grid_z, cityConfig) : 0
    return { cx: wx, cz: wz, originX: wx - (W * CELL) / 2, originZ: wz - (D * CELL) / 2 }
  }, [ownedPlot, cityConfig, W])

  const pos = useRef(new THREE.Vector3())
  const yaw = useRef(0)
  const pitch = useRef(0)
  const initialized = useRef(false)
  const introDone = useRef(false)
  const lockedRef = useRef(false)
  const keys = useRef<Record<string, boolean>>({})
  const hit = useRef({ kind: 'none' as HitKind, cx: 0, cy: 0, cz: 0, px: 0, py: 0, pz: 0 })
  const lastCrosshair = useRef('')
  const tmpColor = useMemo(() => new THREE.Color(), [])

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

  useEffect(() => {
    const el = gl.domElement
    registerLock(() => {
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
      const store = useBuilderStore.getState()

      // Undo/redo
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        e.shiftKey ? store.redo() : store.undo()
        e.preventDefault()
        return
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'y') {
        store.redo()
        e.preventDefault()
        return
      }

      // Tab = open asset library (releases pointer lock)
      if (e.code === 'Tab') {
        e.preventDefault()
        document.exitPointerLock()
        useBuilderStore.setState({ showLibrary: true })
        return
      }

      // Q/E = rotate armed asset
      if (store.armedAsset) {
        if (e.code === 'KeyQ') { store.rotatePlacement(-Math.PI / 2); e.preventDefault(); return }
        if (e.code === 'KeyE') { store.rotatePlacement(Math.PI / 2); e.preventDefault(); return }
        if (e.code === 'Escape') { store.cancelArmedAsset(); e.preventDefault(); return }
      }

      // F = fill tool toggle
      if (e.code === 'KeyF' && !e.ctrlKey && !e.metaKey && !store.armedAsset) {
        store.toggleFillMode()
        e.preventDefault()
        return
      }

      keys.current[e.code] = true
      e.preventDefault()
    }
    const onKeyUp = (e: KeyboardEvent) => {
      keys.current[e.code] = false
    }
    const onMouseDown = (e: MouseEvent) => {
      if (!lockedRef.current) return
      const h = hit.current
      const store = useBuilderStore.getState()

      // Armed asset placement — right-click stamps, left-click cancels
      if (store.armedAsset) {
        if (e.button === 2) {
          if (h.kind === 'none') return
          store.stampAsset(store.armedAsset, h.px, h.py, h.pz, store.placementRotY, W, D, H)
        } else if (e.button === 0) {
          store.cancelArmedAsset()
        }
        return
      }

      if (e.button === 0) {
        if (store.fillMode && store.fillAnchor) {
          store.setFillAnchor(null)
          return
        }
        if (h.kind === 'block') store.removeBlock(h.cx, h.cy, h.cz)
      } else if (e.button === 2) {
        if (h.kind === 'none') return
        if (h.px < 0 || h.px >= W || h.py < 0 || h.py >= H || h.pz < 0 || h.pz >= D) return
        if (store.fillMode) {
          if (!store.fillAnchor) {
            store.setFillAnchor({ x: h.px, y: h.py, z: h.pz })
          } else {
            store.fillVolume(store.fillAnchor, { x: h.px, y: h.py, z: h.pz }, store.selectedBlockType)
          }
          return
        }
        store.placeBlock({ x: h.px, y: h.py, z: h.pz, type: store.selectedBlockType })
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
    r.far = MAX_REACH * CELL
    return r
  }, [])
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

  // Ghost preview — imperatively positioned each frame via ref
  const ghostPos = useRef<[number, number, number] | null>(null)
  const ghostGroupRef = useRef<THREE.Group>(null)

  useFrame((_, dt) => {
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
      if (k['KeyW']) { dx += fwd.x; dz += fwd.z }
      if (k['KeyS']) { dx -= fwd.x; dz -= fwd.z }
      if (k['KeyD']) { dx += rightX; dz += rightZ }
      if (k['KeyA']) { dx -= rightX; dz -= rightZ }
      const len = Math.hypot(dx, dz)
      if (len > 0) { pos.current.x += (dx / len) * speed; pos.current.z += (dz / len) * speed }
      if (k['Space']) pos.current.y += speed
      if (k['ShiftLeft'] || k['ShiftRight']) pos.current.y -= speed
    } else if (!introDone.current) {
      const a = 1 - Math.exp(-3 * dt)
      pos.current.lerp(home.pos, a)
      yaw.current += (home.yaw - yaw.current) * a
      pitch.current += (home.pitch - pitch.current) * a
      if (pos.current.distanceToSquared(home.pos) < 0.01) introDone.current = true
    }

    pos.current.x = THREE.MathUtils.clamp(pos.current.x, originX - PAD, originX + W * CELL + PAD)
    pos.current.z = THREE.MathUtils.clamp(pos.current.z, originZ - PAD, originZ + D * CELL + PAD)
    pos.current.y = THREE.MathUtils.clamp(pos.current.y, 0.8, H * CELL + PAD)

    camera.position.copy(pos.current)
    euler.set(pitch.current, yaw.current, 0)
    camera.quaternion.setFromEuler(euler)

    const hl = highlightRef.current
    ghostPos.current = null

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

    let blockHit: THREE.Intersection | undefined
    let groundHit: THREE.Intersection | undefined
    for (const h of hits) {
      if (h.object === baseRef.current) {
        if (!groundHit) groundHit = h
      } else if (h.faceIndex != null) {
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
      if (hl && !armedAsset) {
        hl.visible = true
        hl.position.set((gx + 0.5) * CELL, 0.5 * CELL, (gz + 0.5) * CELL)
      } else if (hl) {
        hl.visible = false
      }
      if (armedAsset) ghostPos.current = [originX + gx * CELL, 0, originZ + gz * CELL]
      setCrosshair('#ffffff')
    } else if (chosen.faceIndex != null) {
      const block = voxelRef.current?.pickCell(chosen)
      const n = chosen.face?.normal
      if (block && n) {
        const px = block.x + Math.round(n.x)
        const py = block.y + Math.round(n.y)
        const pz = block.z + Math.round(n.z)
        hit.current = { kind: 'block', cx: block.x, cy: block.y, cz: block.z, px, py, pz }
        if (hl && !armedAsset) {
          const inBounds = px >= 0 && px < W && py >= 0 && py < H && pz >= 0 && pz < D
          hl.visible = inBounds
          hl.position.set((px + 0.5) * CELL, (py + 0.5) * CELL, (pz + 0.5) * CELL)
        } else if (hl) {
          hl.visible = false
        }
        if (armedAsset) ghostPos.current = [originX + px * CELL, py * CELL, originZ + pz * CELL]
        tmpColor.set(block.color ?? BLOCK_COLOR[block.type])
        const lum = 0.299 * tmpColor.r + 0.587 * tmpColor.g + 0.114 * tmpColor.b
        setCrosshair(lum > 0.45 ? '#000000' : '#ffffff')
      }
    }

    // Imperatively position the ghost preview each frame
    const gg = ghostGroupRef.current
    if (gg) {
      if (armedAsset && ghostPos.current) {
        gg.visible = true
        gg.position.set(ghostPos.current[0] - originX, ghostPos.current[1], ghostPos.current[2] - originZ)
      } else {
        gg.visible = false
      }
    }
  })

  return (
    <group position={[originX, 0, originZ]}>
      <VoxelBlocksMesh ref={voxelRef} blocks={blocks} />
      <BlockHighlight ref={highlightRef} />

      <mesh ref={baseRef} rotation-x={-Math.PI / 2} position={[(W * CELL) / 2, 0, (D * CELL) / 2]}>
        <planeGeometry args={[W * CELL, D * CELL]} />
        <meshStandardMaterial color={PALETTE.surface} roughness={0.9} metalness={0.05} />
      </mesh>

      <lineSegments
        geometry={cageGeo}
        position={[(W * CELL) / 2, (H * CELL) / 2, (D * CELL) / 2]}
      >
        <lineBasicMaterial color={PALETTE.border} transparent opacity={0.4} toneMapped={false} />
      </lineSegments>

      {fillMode && fillAnchor && (
        <mesh position={[(fillAnchor.x + 0.5) * CELL, (fillAnchor.y + 0.5) * CELL, (fillAnchor.z + 0.5) * CELL]}>
          <boxGeometry args={[CELL * 1.02, CELL * 1.02, CELL * 1.02]} />
          <meshBasicMaterial color={PALETTE.cyan} transparent opacity={0.5} toneMapped={false} depthWrite={false} />
        </mesh>
      )}

      {armedAsset && (
        <group ref={ghostGroupRef} visible={false}>
          <AssetGhostPreview
            asset={armedAsset}
            position={[0, 0, 0]}
            rotY={placementRotY}
          />
        </group>
      )}

      <pointLight
        position={[(W * CELL) / 2, H * CELL * 0.7, (D * CELL) / 2]}
        intensity={0.85}
        distance={H * CELL * 3}
      />
    </group>
  )
}

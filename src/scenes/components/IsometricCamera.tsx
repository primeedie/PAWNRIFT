import { useEffect, useLayoutEffect, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { OrthographicCamera, Vector3 } from 'three'
import { boardFraming, clampZoomScale } from '../../utils/boardFraming'
import { usePawnStore } from '../../game/state/pawnStore'

export function IsometricCamera() {
  const { camera, size, gl, invalidate } = useThree()
  const zoomScale = useRef(1)
  const initialized = useRef(false), currentTarget = useRef(new Vector3())
  const tiles = usePawnStore((state) => state.dungeon.tiles)
  // Canvas already occupies the measured region between header, controls and hand.
  const framing = boardFraming(size.width, size.height, tiles)
  const fittedZoom = framing.zoom
  const [tx, ty, tz] = framing.target

  useLayoutEffect(() => {
    if (!(camera instanceof OrthographicCamera)) return
    if (!initialized.current) {
      currentTarget.current.set(tx,ty,tz)
      camera.position.set(tx + 12, ty + 12, tz + 12)
      camera.lookAt(tx, ty, tz)
      camera.zoom = fittedZoom * zoomScale.current
      initialized.current = true
    }
    camera.updateProjectionMatrix()
    camera.updateMatrixWorld()
    invalidate()
  }, [camera, fittedZoom, invalidate, tx, ty, tz])

  useEffect(() => {
    const canvas = gl.domElement
    const onWheel = (event: WheelEvent) => {
      event.preventDefault()
      const pixels = event.deltaY * (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? size.height : 1)
      zoomScale.current = clampZoomScale(zoomScale.current * Math.exp(-pixels * 0.0015))
      invalidate()
    }
    canvas.addEventListener('wheel', onWheel, { passive: false })
    return () => canvas.removeEventListener('wheel', onWheel)
  }, [gl, invalidate, size.height])

  useFrame((_, delta) => {
    if (!(camera instanceof OrthographicCamera)) return
    const target = fittedZoom * zoomScale.current
    const center = currentTarget.current, ease = 1 - Math.exp(-12 * delta)
    const offset = Math.abs(center.x-tx)+Math.abs(center.y-ty)+Math.abs(center.z-tz)
    if (offset > 0.00001) {
      center.x += (tx-center.x)*ease; center.y += (ty-center.y)*ease; center.z += (tz-center.z)*ease
      camera.position.set(center.x+12,center.y+12,center.z+12); camera.lookAt(center); camera.updateMatrixWorld(); invalidate()
    }
    if (Math.abs(camera.zoom - target) < 0.001) {
      if (camera.zoom !== target) {
        camera.zoom = target
        camera.updateProjectionMatrix()
      }
      return
    }
    camera.zoom += (target - camera.zoom) * (1 - Math.exp(-12 * delta))
    camera.updateProjectionMatrix()
    invalidate()
  })

  return null
}

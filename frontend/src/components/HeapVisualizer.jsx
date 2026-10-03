import { useMemo } from 'react'
import { getLevelColor, getInitials } from '../utils/helpers.js'

/**
 * Renders a Binary Max Heap as both an array view and an SVG binary tree.
 */
export default function HeapVisualizer({ heapStructure, operations }) {
  const { array = [], tree, size = 0 } = heapStructure || {}

  // ── SVG tree layout calculation ──────────────────────────────────────
  const treeLayout = useMemo(() => {
    if (!tree) return { nodes: [], edges: [], width: 0, height: 0 }

    const nodes = []
    const edges = []
    const nodeRadius = 28
    const verticalGap = 80
    const minHorizontalGap = 70

    function layoutNode(node, depth, left, right) {
      if (!node) return
      const x = (left + right) / 2
      const y = depth * verticalGap + 50

      nodes.push({
        ...node,
        x,
        y,
        depth,
      })

      if (node.left) {
        const childX = (left + (left + right) / 2) / 2
        const childY = (depth + 1) * verticalGap + 50
        edges.push({ x1: x, y1: y + nodeRadius, x2: childX, y2: childY - nodeRadius })
        layoutNode(node.left, depth + 1, left, (left + right) / 2)
      }
      if (node.right) {
        const childX = ((left + right) / 2 + right) / 2
        const childY = (depth + 1) * verticalGap + 50
        edges.push({ x1: x, y1: y + nodeRadius, x2: childX, y2: childY - nodeRadius })
        layoutNode(node.right, depth + 1, (left + right) / 2, right)
      }
    }

    // Calculate tree height for width estimation
    let treeHeight = 0
    function getHeight(n, d) {
      if (!n) return
      if (d > treeHeight) treeHeight = d
      getHeight(n.left, d + 1)
      getHeight(n.right, d + 1)
    }
    getHeight(tree, 0)

    const width = Math.max(500, Math.pow(2, treeHeight) * minHorizontalGap)
    const height = (treeHeight + 1) * verticalGap + 80

    layoutNode(tree, 0, 0, width)

    return { nodes, edges, width, height }
  }, [tree])

  if (size === 0) {
    return (
      <div className="heap-visualizer">
        <div style={{
          textAlign: 'center', padding: 40, color: 'var(--text-muted)',
          fontSize: 'var(--font-size-sm)',
        }}>
          <p>Heap is empty. Register patients to see the visualization.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="heap-visualizer">
      {/* Array Representation */}
      <div className="heap-array-section">
        <h3 style={{
          fontSize: 'var(--font-size-sm)', fontWeight: 700,
          color: 'var(--text-secondary)', marginBottom: 8,
        }}>
          Array Representation <span style={{ color: 'var(--text-muted)' }}>
            [index] → score</span>
        </h3>
        <div className="heap-array-row">
          {array.map((node, i) => (
            <div
              key={node.patient_id}
              className={`heap-array-node ${i === 0 ? 'root' : ''}`}
              title={`${node.name} — Score: ${node.priority_score} (${node.emergency_level})`}
            >
              <span className="heap-array-index">[{i}]</span>
              <span
                className="heap-array-score"
                style={{ color: getLevelColor(node.emergency_level) }}
              >
                {node.priority_score}
              </span>
              <span className="heap-array-name">{node.name?.split(' ')[0]}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Tree Visualization */}
      <div className="heap-tree-container">
        <h3 style={{
          fontSize: 'var(--font-size-sm)', fontWeight: 700,
          color: 'var(--text-secondary)', marginBottom: 8,
        }}>
          Binary Tree Structure
        </h3>
        <svg
          className="heap-tree-svg"
          width={treeLayout.width}
          height={treeLayout.height}
          viewBox={`0 0 ${treeLayout.width} ${treeLayout.height}`}
        >
          {/* Edges */}
          {treeLayout.edges.map((edge, i) => (
            <line
              key={i}
              className="tree-edge"
              x1={edge.x1}
              y1={edge.y1}
              x2={edge.x2}
              y2={edge.y2}
            />
          ))}

          {/* Nodes */}
          {treeLayout.nodes.map((node) => {
            const color = getLevelColor(node.emergency_level)
            return (
              <g key={node.patient_id} className="tree-node">
                {/* Glow effect for root */}
                {node.index === 0 && (
                  <circle
                    cx={node.x}
                    cy={node.y}
                    r={34}
                    fill="none"
                    stroke={color}
                    strokeWidth={2}
                    opacity={0.3}
                  >
                    <animate
                      attributeName="r"
                      values="34;40;34"
                      dur="2s"
                      repeatCount="indefinite"
                    />
                    <animate
                      attributeName="opacity"
                      values="0.3;0.1;0.3"
                      dur="2s"
                      repeatCount="indefinite"
                    />
                  </circle>
                )}
                <circle
                  className="tree-node-circle"
                  cx={node.x}
                  cy={node.y}
                  r={28}
                  fill={node.index === 0 ? color : 'var(--bg-glass-hover)'}
                  stroke={color}
                  strokeWidth={2}
                />
                <text
                  x={node.x}
                  y={node.y - 4}
                  textAnchor="middle"
                  fill={node.index === 0 ? '#fff' : 'var(--text-primary)'}
                  fontSize="14"
                  fontWeight="800"
                  fontFamily="Inter, sans-serif"
                >
                  {node.priority_score}
                </text>
                <text
                  x={node.x}
                  y={node.y + 12}
                  textAnchor="middle"
                  fill={node.index === 0 ? 'rgba(255,255,255,0.8)' : 'var(--text-muted)'}
                  fontSize="9"
                  fontFamily="Inter, sans-serif"
                >
                  {node.name?.split(' ')[0]?.slice(0, 8)}
                </text>
              </g>
            )
          })}
        </svg>
      </div>

      {/* Operation Log */}
      {operations && operations.length > 0 && (
        <div style={{ marginTop: 16 }}>
          <h3 style={{
            fontSize: 'var(--font-size-sm)', fontWeight: 700,
            color: 'var(--text-secondary)', marginBottom: 8,
          }}>
            Operation Log
          </h3>
          <div className="operation-log">
            {operations.map((op, i) => (
              <div key={i} className="op-entry">
                <span className={`op-type ${op.operation.toLowerCase().replace('_', '-')}`}>
                  {op.operation}
                </span>
                {' '}
                <span style={{ color: 'var(--text-secondary)' }}>
                  Patient {op.patient_id} — Index {op.from_index}
                  {op.to_index >= 0 ? ` → ${op.to_index}` : ' (removed)'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

"""
Custom Binary Max Heap Implementation for Hospital Emergency Queue.

This module implements a Binary Max Heap using an array/list.
- Primary key: priority_score (descending - higher score wins)
- Secondary key: arrival_time (ascending - earlier timestamp wins on tie)

NO native sorting shortcuts (Array.sort / list.sort) are used.
All ordering is maintained via manual sift-up and sift-down operations.
"""

import time
import copy


class HeapNode:
    """Represents a patient node in the Binary Max Heap."""

    def __init__(self, patient_id, name, priority_score, arrival_time,
                 emergency_level, status="WAITING", age=0, gender="",
                 phone="", symptoms=None, vitals=None, score_explanation="",
                 condition="", assigned_md="Dr. Elena Rostova", clinical_notes="",
                 priority_label=""):
        self.patient_id = patient_id
        self.name = name
        self.priority_score = priority_score
        self.arrival_time = arrival_time
        self.emergency_level = emergency_level
        self.status = status
        self.age = age
        self.gender = gender
        self.phone = phone
        self.symptoms = symptoms or []
        self.vitals = vitals or {}
        self.score_explanation = score_explanation
        self.condition = condition or (self.symptoms[0] if self.symptoms else "Emergency Triage")
        self.assigned_md = assigned_md or "Dr. Elena Rostova"
        self.clinical_notes = clinical_notes or (self.symptoms[0] if self.symptoms else "")
        self.priority_label = priority_label or self._calc_priority_label()

    def _calc_priority_label(self):
        lvl = self.emergency_level.upper()
        if lvl == "CRITICAL" or self.priority_score >= 85:
            return "P5 Critical"
        if lvl == "HIGH" or self.priority_score >= 65:
            return "P4 Very Urgent"
        if lvl == "MEDIUM" or self.priority_score >= 45:
            return "P3 Urgent"
        return "P2 Moderate"

    def to_dict(self):
        return {
            "patient_id": self.patient_id,
            "name": self.name,
            "priority_score": self.priority_score,
            "arrival_time": self.arrival_time,
            "emergency_level": self.emergency_level,
            "status": self.status,
            "age": self.age,
            "gender": self.gender,
            "phone": self.phone,
            "symptoms": self.symptoms,
            "vitals": self.vitals,
            "score_explanation": self.score_explanation,
            "condition": self.condition,
            "assigned_md": self.assigned_md,
            "clinical_notes": self.clinical_notes,
            "priority_label": self.priority_label or self._calc_priority_label(),
        }

    def __repr__(self):
        return (f"HeapNode(id={self.patient_id}, name={self.name}, "
                f"score={self.priority_score}, level={self.emergency_level})")


def _compare(a: HeapNode, b: HeapNode) -> bool:
    """
    Return True if node `a` has HIGHER priority than node `b`.
    Primary: higher priority_score wins.
    Secondary: earlier arrival_time wins (lower timestamp).
    """
    if a.priority_score != b.priority_score:
        return a.priority_score > b.priority_score
    return a.arrival_time < b.arrival_time


class BinaryMaxHeap:
    """
    Binary Max Heap backed by a Python list.

    Invariant: For every node at index i, the node's priority >= its children's.
    Parent of i  => (i - 1) // 2
    Left child   => 2*i + 1
    Right child  => 2*i + 2
    """

    def __init__(self):
        self._heap: list[HeapNode] = []
        self._id_index: dict[str, int] = {}   # patient_id -> index for O(1) lookup
        self._operation_log: list[dict] = []   # Tracks sift operations for visualizer

    # ── helpers ──────────────────────────────────────────────────────────
    def _parent(self, i):
        return (i - 1) // 2

    def _left(self, i):
        return 2 * i + 1

    def _right(self, i):
        return 2 * i + 2

    def _swap(self, i, j):
        """Swap two nodes and update the id->index map."""
        self._heap[i], self._heap[j] = self._heap[j], self._heap[i]
        self._id_index[self._heap[i].patient_id] = i
        self._id_index[self._heap[j].patient_id] = j

    def _log_op(self, operation, node_id, from_idx, to_idx):
        self._operation_log.append({
            "operation": operation,
            "patient_id": node_id,
            "from_index": from_idx,
            "to_index": to_idx,
            "timestamp": time.time(),
            "heap_snapshot": [n.to_dict() for n in self._heap],
        })

    # ── sift operations ─────────────────────────────────────────────────
    def _sift_up(self, i):
        """Move node at index i upward until heap property is restored."""
        while i > 0:
            p = self._parent(i)
            if _compare(self._heap[i], self._heap[p]):
                self._log_op("SIFT_UP", self._heap[i].patient_id, i, p)
                self._swap(i, p)
                i = p
            else:
                break

    def _sift_down(self, i):
        """Move node at index i downward until heap property is restored."""
        size = len(self._heap)
        while True:
            largest = i
            left = self._left(i)
            right = self._right(i)

            if left < size and _compare(self._heap[left], self._heap[largest]):
                largest = left
            if right < size and _compare(self._heap[right], self._heap[largest]):
                largest = right

            if largest != i:
                self._log_op("SIFT_DOWN", self._heap[i].patient_id, i, largest)
                self._swap(i, largest)
                i = largest
            else:
                break

    # ── public API ───────────────────────────────────────────────────────
    def insert(self, patient: HeapNode):
        """Add patient to heap end and sift up."""
        self._operation_log.clear()
        idx = len(self._heap)
        self._heap.append(patient)
        self._id_index[patient.patient_id] = idx
        self._log_op("INSERT", patient.patient_id, idx, idx)
        self._sift_up(idx)
        return self.get_operation_log()

    def extract_max(self):
        """
        Remove and return the root node (highest priority).
        Place last node at root and sift down.
        """
        if not self._heap:
            return None, []
        self._operation_log.clear()

        root = self._heap[0]
        last_idx = len(self._heap) - 1

        if last_idx == 0:
            self._heap.pop()
            del self._id_index[root.patient_id]
            self._log_op("EXTRACT_MAX", root.patient_id, 0, -1)
            return root, self.get_operation_log()

        # Move last to root
        self._swap(0, last_idx)
        self._heap.pop()
        del self._id_index[root.patient_id]
        self._log_op("EXTRACT_MAX", root.patient_id, 0, -1)

        if self._heap:
            self._sift_down(0)

        return root, self.get_operation_log()

    def peek(self):
        """View the next patient to be treated without removal."""
        if not self._heap:
            return None
        return self._heap[0]

    def update_priority(self, patient_id: str, new_score: int,
                        new_level: str = None, new_explanation: str = None):
        """
        Update a patient's priority score and re-heapify.
        Used for Emergency Escalation.
        """
        if patient_id not in self._id_index:
            return False, []
        self._operation_log.clear()

        idx = self._id_index[patient_id]
        old_score = self._heap[idx].priority_score
        self._heap[idx].priority_score = new_score
        if new_level:
            self._heap[idx].emergency_level = new_level
        if new_explanation:
            self._heap[idx].score_explanation = new_explanation

        self._log_op("UPDATE_PRIORITY", patient_id, idx, idx)

        if new_score > old_score:
            self._sift_up(idx)
        else:
            self._sift_down(idx)

        return True, self.get_operation_log()

    def remove(self, patient_id: str):
        """Remove a specific patient node and re-heapify."""
        if patient_id not in self._id_index:
            return None, []
        self._operation_log.clear()

        idx = self._id_index[patient_id]
        removed = self._heap[idx]
        last_idx = len(self._heap) - 1

        if idx == last_idx:
            self._heap.pop()
            del self._id_index[patient_id]
            self._log_op("REMOVE", patient_id, idx, -1)
            return removed, self.get_operation_log()

        self._swap(idx, last_idx)
        self._heap.pop()
        del self._id_index[patient_id]
        self._log_op("REMOVE", patient_id, idx, -1)

        if idx < len(self._heap):
            self._sift_up(idx)
            self._sift_down(self._id_index[self._heap[idx].patient_id]
                            if idx < len(self._heap) else idx)

        return removed, self.get_operation_log()

    def get_heap_structure(self):
        """
        Return array representation and binary tree node structure
        for visual rendering.
        """
        array_repr = [node.to_dict() for node in self._heap]

        def build_tree(idx):
            if idx >= len(self._heap):
                return None
            node = self._heap[idx].to_dict()
            node["index"] = idx
            node["left"] = build_tree(self._left(idx))
            node["right"] = build_tree(self._right(idx))
            return node

        tree_repr = build_tree(0) if self._heap else None

        return {
            "array": array_repr,
            "tree": tree_repr,
            "size": len(self._heap),
        }

    def get_all_patients(self):
        """Return all patients in heap order (array index order)."""
        return [node.to_dict() for node in self._heap]

    def get_sorted_patients(self):
        """
        Return patients sorted by priority (highest first).
        Uses a COPY of the heap and extracts max repeatedly.
        NO native sort used — pure heap-based ordering.
        """
        temp_heap = BinaryMaxHeap()
        temp_heap._heap = [copy.deepcopy(n) for n in self._heap]
        temp_heap._id_index = dict(self._id_index)

        result = []
        while temp_heap._heap:
            node, _ = temp_heap.extract_max()
            if node:
                result.append(node.to_dict())
        return result

    def get_operation_log(self):
        return list(self._operation_log)

    def find_patient(self, patient_id: str):
        if patient_id not in self._id_index:
            return None
        idx = self._id_index[patient_id]
        return self._heap[idx].to_dict()

    @property
    def size(self):
        return len(self._heap)

    @property
    def is_empty(self):
        return len(self._heap) == 0

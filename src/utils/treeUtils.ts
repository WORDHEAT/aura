import type { Row } from '../components/Table/Table'

export const updateRowInTree = (rows: Row[], rowId: string, updateFn: (row: Row) => Row): Row[] => {
    return rows.map((row) => {
        if (row.id === rowId) {
            return updateFn(row)
        }
        if (row.children && row.children.length > 0) {
            return { ...row, children: updateRowInTree(row.children, rowId, updateFn) }
        }
        return row
    })
}

export const deleteRowFromTree = (rows: Row[], rowId: string): Row[] => {
    return rows.filter((row) => row.id !== rowId).map((row) => {
        if (row.children) {
            return { ...row, children: deleteRowFromTree(row.children, rowId) }
        }
        return row
    })
}

export const addChildToRowInTree = (rows: Row[], parentId: string, newRow: Row): Row[] => {
    return rows.map((row) => {
        if (row.id === parentId) {
            return {
                ...row,
                children: [...(row.children || []), newRow],
                isExpanded: true
            }
        }
        if (row.children) {
            return { ...row, children: addChildToRowInTree(row.children, parentId, newRow) }
        }
        return row
    })
}

export const addSiblingToTree = (rows: Row[], siblingId: string, newRow: Row): Row[] => {
    const index = rows.findIndex(r => r.id === siblingId)
    if (index !== -1) {
        const result = [...rows]
        result.splice(index + 1, 0, newRow)
        return result
    }
    
    return rows.map(row => {
        if (row.children) {
            return { ...row, children: addSiblingToTree(row.children, siblingId, newRow) }
        }
        return row
    })
}

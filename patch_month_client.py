import os

filepath = "/Users/virajshah/Financial Planner/cash-clarity/src/app/(app)/month/[year]/[month]/month-client.tsx"
with open(filepath, 'r') as f:
    content = f.read()

# 1. Imports
content = content.replace(
    'import { useState, useCallback, useMemo } from "react";',
    'import { useState, useCallback, useMemo, useEffect, useRef } from "react";'
)
content = content.replace(
    'createEntry, updateEntry, deleteEntry, bulkCreateEntries,\n} from "@/app/actions/entries";',
    'createEntry, updateEntry, deleteEntry, bulkCreateEntries, upsertEntries,\n} from "@/app/actions/entries";'
)

# 2. Extract EntryTableRow
row_component_str = """    // Table row component for an entry
    const EntryTableRow = ({
        entry,
        index,
        relevantCategories,
        showCategory = false,
    }: {
        entry: EntryRow;
        index: number;
        relevantCategories: Category[];
        showCategory?: boolean;
    }) => (
        <TableRow key={entry.id} className="group">
            <TableCell className="text-muted-foreground text-xs">{index + 1}</TableCell>
            <TableCell>
                <Input
                    value={entry.description}
                    onChange={(e) => updateRow(entry.id, "description", e.target.value)}
                    className="h-8 border-0 bg-transparent px-1 focus-visible:bg-background/50"
                    placeholder="Description"
                />
            </TableCell>
            {showCategory && (
                <TableCell>
                    <Select
                        value={entry.category_id}
                        onValueChange={(v) => updateRow(entry.id, "category_id", v)}
                    >
                        <SelectTrigger className="h-8 border-0 bg-transparent text-xs">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            {relevantCategories.map((c) => (
                                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </TableCell>
            )}
            <TableCell className="text-right">
                <Input
                    type="number"
                    value={entry.amount}
                    onChange={(e) => updateRow(entry.id, "amount", parseFloat(e.target.value) || 0)}
                    className="h-8 border-0 bg-transparent px-1 text-right focus-visible:bg-background/50"
                />
            </TableCell>
            <TableCell>
                <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => removeRow(entry.id)}
                >
                    <Trash2 className="h-3 w-3 text-destructive" />
                </Button>
            </TableCell>
        </TableRow>
    );"""

new_row_component_str = """interface EntryTableRowProps {
    entry: EntryRow;
    index: number;
    relevantCategories: Category[];
    showCategory?: boolean;
    onUpdate: (id: string, field: string, value: string | number) => void;
    onRemove: (id: string) => void;
}

function EntryTableRow({
    entry,
    index,
    relevantCategories,
    showCategory = false,
    onUpdate,
    onRemove,
}: EntryTableRowProps) {
    return (
        <TableRow className="group">
            <TableCell className="text-muted-foreground text-xs">{index + 1}</TableCell>
            <TableCell>
                <Input
                    value={entry.description}
                    onChange={(e) => onUpdate(entry.id, "description", e.target.value)}
                    className="h-8 border-0 bg-transparent px-1 focus-visible:bg-background/50"
                    placeholder="Description"
                />
            </TableCell>
            {showCategory && (
                <TableCell>
                    <Select
                        value={entry.category_id}
                        onValueChange={(v) => onUpdate(entry.id, "category_id", v)}
                    >
                        <SelectTrigger className="h-8 border-0 bg-transparent text-xs">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            {relevantCategories.map((c) => (
                                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </TableCell>
            )}
            <TableCell className="text-right">
                <Input
                    type="number"
                    value={entry.amount === 0 ? "" : entry.amount}
                    onChange={(e) => onUpdate(entry.id, "amount", parseFloat(e.target.value) || 0)}
                    className="h-8 border-0 bg-transparent px-1 text-right focus-visible:bg-background/50"
                />
            </TableCell>
            <TableCell>
                <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => onRemove(entry.id)}
                >
                    <Trash2 className="h-3 w-3 text-destructive" />
                </Button>
            </TableCell>
        </TableRow>
    );
}"""

content = content.replace(row_component_str, "")
content = content.replace("export default function MonthClient", new_row_component_str + "\n\nexport default function MonthClient")

# 3. Add SyncState and useEffect
state_str = """    const [saving, setSaving] = useState(false);
    const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());"""

new_state_str = """    const [saving, setSaving] = useState(false);
    const [syncState, setSyncState] = useState<"idle" | "saving" | "saved" | "error">("idle");
    const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());

    const initialConfig = useRef({ openingBalance: openingBalance, dividends: dividends, closingOverrideEnabled: closingOverrideEnabled, closingOverride: closingOverride });

    // Auto-save effect
    useEffect(() => {
        const hasPendingChanges = entries.some(e => (e.isNew && e.description) || e.isEdited) ||
            openingBalance !== initialConfig.current.openingBalance ||
            dividends !== initialConfig.current.dividends ||
            closingOverrideEnabled !== initialConfig.current.closingOverrideEnabled ||
            closingOverride !== initialConfig.current.closingOverride;

        if (!hasPendingChanges) return;

        setSyncState("saving");
        const timer = setTimeout(() => {
            saveAll(false);
            initialConfig.current = { openingBalance, dividends, closingOverrideEnabled, closingOverride };
        }, 1500);

        return () => clearTimeout(timer);
    }, [entries, openingBalance, dividends, closingOverrideEnabled, closingOverride]);"""
content = content.replace(state_str, new_state_str)


# 4. Modify UUIDs
content = content.replace("id: `new-${Date.now()}`", "id: crypto.randomUUID()")
content = content.replace("id: `new-${Date.now()}-${Math.random()}`", "id: crypto.randomUUID()")

# 5. Modify removeRow
old_remove = """    const removeRow = async (id: string) => {
        if (id.startsWith("new-")) {
            setEntries((prev) => prev.filter((e) => e.id !== id));
            return;
        }
        try {
            await deleteEntry(id);
            setEntries((prev) => prev.filter((e) => e.id !== id));
            toast.success("Entry deleted");
        } catch {
            toast.error("Failed to delete entry");
        }
    };"""

new_remove = """    const removeRow = async (id: string) => {
        const entryToRemove = entries.find((e) => e.id === id);
        if (entryToRemove?.isNew) {
            setEntries((prev) => prev.filter((e) => e.id !== id));
            return;
        }
        try {
            await deleteEntry(id);
            setEntries((prev) => prev.filter((e) => e.id !== id));
            toast.success("Entry deleted");
        } catch {
            toast.error("Failed to delete entry");
        }
    };"""
content = content.replace(old_remove, new_remove)

# 6. Pass onUpdate / onRemove
call1 = """                                                    <EntryTableRow
                                                        key={entry.id}
                                                        entry={entry}
                                                        index={i}
                                                        relevantCategories={groupCats}
                                                    />"""
new_call1 = """                                                    <EntryTableRow
                                                        key={entry.id}
                                                        entry={entry}
                                                        index={i}
                                                        relevantCategories={groupCats}
                                                        onUpdate={updateRow}
                                                        onRemove={removeRow}
                                                    />"""
content = content.replace(call1, new_call1)

call2 = """                                <EntryTableRow
                                    key={entry.id}
                                    entry={entry}
                                    index={i}
                                    relevantCategories={categories.filter((c) => c.type === direction)}
                                    showCategory
                                />"""
new_call2 = """                                <EntryTableRow
                                    key={entry.id}
                                    entry={entry}
                                    index={i}
                                    relevantCategories={categories.filter((c) => c.type === direction)}
                                    showCategory
                                    onUpdate={updateRow}
                                    onRemove={removeRow}
                                />"""
content = content.replace(call2, new_call2)

# 7. Modify saveAll
old_saveAll = """    const saveAll = async () => {
        setSaving(true);
        try {
            const newEntries = entries.filter((e) => e.isNew && e.description);
            if (newEntries.length > 0) {
                await bulkCreateEntries(
                    newEntries.map((e) => ({
                        workspace_id: workspaceId,
                        period_id: period.id,
                        direction: e.direction,
                        category_id: e.category_id,
                        description: e.description,
                        amount: Number(e.amount),
                    }))
                );
            }

            const editedEntries = entries.filter((e) => e.isEdited);
            for (const entry of editedEntries) {
                await updateEntry(entry.id, {
                    description: entry.description,
                    amount: Number(entry.amount),
                    category_id: entry.category_id,
                });
            }

            await upsertPeriodOverrides(period.id, {
                opening_balance_override: openingBalance ? parseFloat(openingBalance) : null,
                dividends_released: dividends,
                closing_balance_override: closingOverrideEnabled && closingOverride
                    ? parseFloat(closingOverride) : null,
            });

            toast.success("All changes saved");
            router.refresh();
        } catch {
            toast.error("Failed to save changes");
        } finally {
            setSaving(false);
        }
    };"""

new_saveAll = """    const saveAll = async (showToast = true) => {
        if (showToast) setSaving(true);

        try {
            const toSave = entries.filter((e) => (e.isNew && e.description) || e.isEdited);
            
            if (toSave.length > 0) {
                await upsertEntries(
                    toSave.map((e) => ({
                        id: e.id,
                        workspace_id: workspaceId,
                        period_id: period.id,
                        direction: e.direction,
                        category_id: e.category_id,
                        description: e.description,
                        amount: Number(e.amount),
                    }))
                );

                const savedIds = new Set(toSave.map(e => e.id));
                setEntries(prev => prev.map(e => 
                    savedIds.has(e.id) ? { ...e, isNew: false, isEdited: false } : e
                ));
            }

            await upsertPeriodOverrides(period.id, {
                opening_balance_override: openingBalance ? parseFloat(openingBalance) : null,
                dividends_released: dividends,
                closing_balance_override: closingOverrideEnabled && closingOverride
                    ? parseFloat(closingOverride) : null,
            });

            if (showToast) toast.success("All changes saved");
            setSyncState("saved");
            router.refresh();
        } catch {
            if (showToast) toast.error("Failed to save changes");
            setSyncState("error");
        } finally {
            if (showToast) setSaving(false);
        }
    };"""
content = content.replace(old_saveAll, new_saveAll)

# 8. Render UI save state indicator
old_buttons = """                    <Button variant="outline" size="sm" onClick={handleGenerate}>
                        <RotateCw className="h-3.5 w-3.5 mr-1.5" />
                        Generate Recurring
                    </Button>
                    <Button size="sm" onClick={saveAll} disabled={saving}>
                        <Save className="h-3.5 w-3.5 mr-1.5" />
                        {saving ? "Saving..." : "Save All"}
                    </Button>"""

new_buttons = """                    <div className="flex items-center gap-2 mr-2 text-xs text-muted-foreground font-medium">
                        {syncState === "saving" && <span className="flex items-center gap-1.5"><RotateCw className="h-3 w-3 animate-spin" /> Saving...</span>}
                        {syncState === "saved" && <span className="flex items-center gap-1.5 text-emerald-500"><Save className="h-3 w-3" /> Saved</span>}
                        {syncState === "error" && <span className="flex items-center gap-1.5 text-destructive"><AlertTriangle className="h-3 w-3" /> Error saving</span>}
                    </div>
                    <Button variant="outline" size="sm" onClick={handleGenerate}>
                        <RotateCw className="h-3.5 w-3.5 mr-1.5" />
                        Generate Recurring
                    </Button>
                    <Button size="sm" onClick={() => saveAll(true)} disabled={saving}>
                        <Save className="h-3.5 w-3.5 mr-1.5" />
                        {saving ? "Saving..." : "Save All"}
                    </Button>"""
content = content.replace(old_buttons, new_buttons)

with open(filepath, 'w') as f:
    f.write(content)

print("Patch applied to content length:", len(content))

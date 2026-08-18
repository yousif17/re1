<Select value={employeeForm.role} onValueChange={(v) => setEmployeeForm({ ...employeeForm, role: v })}>
  <SelectTrigger>
    <SelectValue placeholder="Select role" />
  </SelectTrigger>
  <SelectContent>
    <SelectItem value="CASHIER">Cashier</SelectItem>
    <SelectItem value="KITCHEN">Kitchen Staff</SelectItem>
    <SelectItem value="WAITER">Waiter</SelectItem>
    <SelectItem value="MANAGER">Manager</SelectItem>
  </SelectContent>
</Select>
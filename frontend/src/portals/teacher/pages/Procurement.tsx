import ProcurementUI from '../../../components/portals/shared/ProcurementUI';

export default function TeacherProcurement() {
  return (
    <>
      <div className="portal-page-header">
        <h1>Classroom Procurement</h1>
        <p>Raise requisitions for classroom supplies, stationery, or departmental resources.</p>
      </div>

      <ProcurementUI mode="FULL" />
    </>
  );
}

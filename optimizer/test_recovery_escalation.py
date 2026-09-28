from optimizer.recovery import recover_with_escalation
from optimizer.test_restricted_recovery import fixture, START, END, AS_OF, ALLOW


def test_first_validated_local_repair_stops_escalation():
    data, resources, parent, disruption = fixture()
    result = recover_with_escalation(
        data, parent, disruption, START, END, resource_context=resources,
        allowances=ALLOW, snapshot_as_of=AS_OF,
    )
    assert result["status"] == "success"
    assert result["seed_block_ids"] == ["P_A"]
    assert result["tier"] == "LOCAL"
    assert result["attempts"] == [dict(
        tier="LOCAL", mutable_block_ids=["P_A", "P_B"], status="VALIDATED",
        validation=result["diagnostics"]["complete_validation"],
    )]

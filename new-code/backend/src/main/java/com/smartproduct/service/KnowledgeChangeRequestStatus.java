package com.smartproduct.service;

public final class KnowledgeChangeRequestStatus {
    private KnowledgeChangeRequestStatus() {
    }

    public static final String CREATE = "CREATE";
    public static final String UPDATE = "UPDATE";
    public static final String DELETE = "DELETE";

    // PENDING: the applicant has submitted the change, but no reviewer has approved or rejected it yet.
    public static final String PENDING = "PENDING";
    // APPROVED: a reviewer approved the request and the change has already been applied to the formal knowledge tables.
    public static final String APPROVED = "APPROVED";
    // REJECTED: a reviewer rejected the request; it remains as an audit record and can be deleted from the applicant's list.
    public static final String REJECTED = "REJECTED";
    // WITHDRAWN: the applicant withdrew a pending request before review; it will never be applied unless submitted again.
    public static final String WITHDRAWN = "WITHDRAWN";
}

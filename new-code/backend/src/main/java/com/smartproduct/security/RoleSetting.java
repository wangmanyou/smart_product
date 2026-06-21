package com.smartproduct.security;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

public class RoleSetting {
    public boolean admin;
    public List<String> pagePermissions = new ArrayList<>();
    public List<String> operationPermissions = new ArrayList<>();
    public Map<String, Boolean> approvalRequired = new LinkedHashMap<>();
    public List<Long> sceneTemplateIds = new ArrayList<>();
}

package com.smartproduct.controller;

import com.smartproduct.dto.UserDto;
import com.smartproduct.dto.UserRequests;
import com.smartproduct.service.UserService;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
public class UserController {
    private final UserService service;

    public UserController(UserService service) {
        this.service = service;
    }

    @GetMapping("/v1/data/user/login")
    public Map<String, Object> login(@RequestParam String userAccount, @RequestParam String userPassword) {
        return service.login(userAccount, userPassword);
    }

    @GetMapping("/v1/data/user/current/detail")
    public UserDto current(@RequestHeader(value = "Authorization", required = false) String authorization) {
        return service.current(authorization);
    }

    @GetMapping("/v1/data/user/detail")
    @PreAuthorize("hasAnyAuthority('system:manage','system:user:manage')")
    public UserDto detail(@RequestParam Long userId) {
        return service.detail(userId);
    }

    @GetMapping("/v1/data/user/list")
    @PreAuthorize("hasAnyAuthority('system:manage','system:user:manage')")
    public Map<String, Object> list(
            @RequestParam(defaultValue = "1") int pageNumber,
            @RequestParam(defaultValue = "10") int pageSize,
            @RequestParam(required = false) String searchUserAccount,
            @RequestParam(required = false) String searchUserNickname,
            @RequestParam(required = false) String searchUserEmail,
            @RequestParam(required = false) String searchUserPhoneNum,
            @RequestParam(required = false) String searchUserSex,
            @RequestParam(required = false) String searchUserDisabled
    ) {
        return service.list(pageNumber, pageSize, searchUserAccount, searchUserNickname, searchUserEmail, searchUserPhoneNum, searchUserSex, searchUserDisabled);
    }

    @PostMapping("/v1/data/user/add")
    @PreAuthorize("hasAnyAuthority('system:manage','system:user:manage')")
    public Map<String, Object> add(@RequestBody UserRequests.AddUserRequest request) {
        return service.add(request);
    }

    @PostMapping("/v1/data/user/edit")
    @PreAuthorize("hasAnyAuthority('system:manage','system:user:manage')")
    public Map<String, Object> edit(@RequestBody UserRequests.EditUserRequest request) {
        service.edit(request);
        return Map.of();
    }

    @PostMapping("/v1/data/user/edit/status")
    @PreAuthorize("hasAnyAuthority('system:manage','system:user:manage')")
    public Map<String, Object> editStatus(@RequestBody UserRequests.EditStatusRequest request) {
        service.editStatus(request);
        return Map.of();
    }

    @PostMapping("/v1/data/user/delete")
    @PreAuthorize("hasAnyAuthority('system:manage','system:user:manage')")
    public Map<String, Object> delete(@RequestBody UserRequests.UserIdRequest request) {
        service.delete(request.userId);
        return Map.of();
    }

    @PostMapping("/v1/data/user/password/reset")
    @PreAuthorize("hasAnyAuthority('system:manage','system:user:manage')")
    public Map<String, Object> resetPassword(@RequestBody UserRequests.ResetPasswordRequest request) {
        service.resetPassword(request);
        return Map.of();
    }

    @GetMapping("/v1/data/user/password/random")
    @PreAuthorize("hasAnyAuthority('system:manage','system:user:manage')")
    public Map<String, Object> randomPassword() {
        return service.randomPassword();
    }
}

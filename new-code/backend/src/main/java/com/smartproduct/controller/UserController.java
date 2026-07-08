package com.smartproduct.controller;

import com.smartproduct.dto.UserDto;
import com.smartproduct.dto.UserRequests;
import com.smartproduct.service.AccessLogService;
import com.smartproduct.service.LoginCryptoService;
import com.smartproduct.service.UserService;
import com.smartproduct.shared.exception.ApiException;
import org.springframework.http.HttpStatus;
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
    private final LoginCryptoService loginCryptoService;
    private final AccessLogService accessLogs;

    public UserController(UserService service, LoginCryptoService loginCryptoService, AccessLogService accessLogs) {
        this.service = service;
        this.loginCryptoService = loginCryptoService;
        this.accessLogs = accessLogs;
    }

    @GetMapping("/v1/data/user/login/key")
    public Map<String, Object> loginKey() {
        return loginCryptoService.publicKey();
    }

    @PostMapping("/v1/data/user/login")
    public Map<String, Object> login(@RequestBody(required = false) UserRequests.LoginRequest request) {
        String account = request == null ? "" : request.userAccount;
        try {
            if (request == null) {
                throw new ApiException(HttpStatus.BAD_REQUEST.value(), "登录信息校验失败，请刷新页面后重试");
            }
            String password = request.encryptedPassword == null || request.encryptedPassword.isBlank()
                    ? request.userPassword
                    : loginCryptoService.decryptPassword(request.encryptedPassword);
            if (password == null || password.isBlank()) {
                throw new ApiException(HttpStatus.BAD_REQUEST.value(), "Invalid login payload");
            }
            Map<String, Object> result = service.login(request.userAccount, password);
            accessLogs.login(account, true, null);
            return result;
        } catch (RuntimeException ex) {
            accessLogs.login(account, false, ex.getMessage());
            throw ex;
        }
    }

    @PostMapping("/v1/data/user/logout")
    public Map<String, Object> logout() {
        accessLogs.success("用户认证", "LOGOUT", "USER", null, null, "用户退出登录");
        return Map.of();
    }

    @GetMapping("/v1/data/user/login-log/my")
    public Map<String, Object> myLoginLogs(@RequestParam(defaultValue = "1") int pageNumber,
                                           @RequestParam(defaultValue = "10") int pageSize) {
        return accessLogs.myLoginLogs(pageNumber, pageSize);
    }

    @GetMapping("/v1/data/user/login-log/list")
    @PreAuthorize("hasAuthority('system:user:manage')")
    public Map<String, Object> userLoginLogs(@RequestParam Long userId,
                                             @RequestParam(defaultValue = "1") int pageNumber,
                                             @RequestParam(defaultValue = "10") int pageSize) {
        return accessLogs.userLoginLogs(userId, pageNumber, pageSize);
    }

    @GetMapping("/v1/data/user/current/detail")
    public UserDto current(@RequestHeader(value = "Authorization", required = false) String authorization) {
        return service.current(authorization);
    }

    @PostMapping("/v1/data/user/current/edit")
    public UserDto editCurrent(@RequestBody UserRequests.EditCurrentUserRequest request,
                               @RequestHeader(value = "Authorization", required = false) String authorization) {
        return service.editCurrent(request, authorization);
    }

    @GetMapping("/v1/data/user/detail")
    @PreAuthorize("hasAuthority('system:user:manage')")
    public UserDto detail(@RequestParam Long userId) {
        return service.detail(userId);
    }

    @GetMapping("/v1/data/user/list")
    @PreAuthorize("hasAuthority('system:user:manage')")
    public Map<String, Object> list(
            @RequestParam(defaultValue = "1") int pageNumber,
            @RequestParam(defaultValue = "10") int pageSize,
            @RequestParam(required = false) String searchUserAccount,
            @RequestParam(required = false) String searchUserNickname,
            @RequestParam(required = false) String searchUserEmail,
            @RequestParam(required = false) String searchUserPhoneNum,
            @RequestParam(required = false) String searchUserSex,
            @RequestParam(required = false) String searchUserDisabled,
            @RequestParam(required = false) String searchKeyword
    ) {
        return service.list(pageNumber, pageSize, searchUserAccount, searchUserNickname, searchUserEmail, searchUserPhoneNum, searchUserSex, searchUserDisabled, searchKeyword);
    }

    @PostMapping("/v1/data/user/add")
    @PreAuthorize("hasAuthority('system:user:manage')")
    public Map<String, Object> add(@RequestBody UserRequests.AddUserRequest request) {
        return service.add(request);
    }

    @PostMapping("/v1/data/user/edit")
    @PreAuthorize("hasAuthority('system:user:manage')")
    public Map<String, Object> edit(@RequestBody UserRequests.EditUserRequest request) {
        service.edit(request);
        return Map.of();
    }

    @PostMapping("/v1/data/user/edit/status")
    @PreAuthorize("hasAuthority('system:user:manage')")
    public Map<String, Object> editStatus(@RequestBody UserRequests.EditStatusRequest request) {
        service.editStatus(request);
        return Map.of();
    }

    @PostMapping("/v1/data/user/delete")
    @PreAuthorize("hasAuthority('system:user:manage')")
    public Map<String, Object> delete(@RequestBody UserRequests.UserIdRequest request) {
        service.delete(request.userId);
        return Map.of();
    }

    @PostMapping("/v1/data/user/password/reset")
    @PreAuthorize("hasAuthority('system:user:manage')")
    public Map<String, Object> resetPassword(@RequestBody UserRequests.ResetPasswordRequest request) {
        service.resetPassword(request);
        return Map.of();
    }

    @GetMapping("/v1/data/user/password/random")
    @PreAuthorize("hasAuthority('system:user:manage')")
    public Map<String, Object> randomPassword() {
        return service.randomPassword();
    }
}

vim.api.nvim_create_autocmd("BufWritePost", {
    pattern = "*.ts",
    callback = function()
        local handle = vim.uv.spawn("pnpm", { args = { "build" } }, function(code)
            if code == 0 then
                vim.notify("Build completed successfully!", vim.log.levels.INFO)
            else
                vim.notify("Build failed with exit code " .. code, vim.log.levels.ERROR)
            end
        end)

        if not handle then
            vim.notify("Failed to start build process", vim.log.levels.ERROR)
        end
    end,
})

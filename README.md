# romania_osm_maps

# Run
```sh
go run utils.go main.go
```

# integrate with systemd
```
cp water.service /etc/systemd/system
systemctl daemon-reload
systemctl enable water
systemctl start water
```
